import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { loadProfile } from "../src/profile.js";
import { buildPrompt, parseJudgeResponse } from "../src/judge.js";
import type { TasteProfile, Verdict } from "../src/types.js";

export interface Fixture {
  id: string;
  description: string;
  input: string;
  expect: { verdict: "pass" | "fix"; minConfidence?: number; violationContains?: string[] };
}

export type Category = "should-fix" | "should-pass" | "edge" | "adversarial";

export interface Result {
  fixture: Fixture;
  category: Category;
  actual: Verdict;
  correct: boolean;
  costUsd: number;
}

interface JudgeResult {
  verdict: Verdict;
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
}

async function runJudgeCli(profile: TasteProfile, code: string, model = "claude-haiku-4-5"): Promise<JudgeResult> {
  const prompt = buildPrompt(profile, code);
  // --system-prompt replaces Claude Code's default (removes ~30k tokens of bias + context).
  // --tools "" disables all tools — we just want a one-shot prompt→response.
  return new Promise((resolve) => {
    const child = spawn("claude", [
      "-p", prompt.userMessage,
      "--system-prompt", prompt.cachedSystem,
      "--tools", "",
      "--model", model,
      "--output-format", "json",
    ], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => { out += d.toString(); });
    child.stderr.on("data", (d) => { err += d.toString(); });
    child.on("error", (_e) => {
      resolve({
        verdict: { kind: "degraded", reason: "api_error" },
        usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      });
    });
    child.on("close", () => {
      try {
        const obj = JSON.parse(out);
        if (obj.is_error) {
          resolve({
            verdict: { kind: "degraded", reason: "api_error" },
            usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
          });
          return;
        }
        const verdict = parseJudgeResponse(String(obj.result ?? ""));
        const modelKey = Object.keys(obj.modelUsage ?? {})[0];
        const usage = modelKey ? obj.modelUsage[modelKey] : { inputTokens: 0, outputTokens: 0, costUSD: 0 };
        resolve({
          verdict,
          usage: {
            inputTokens: Number(usage.inputTokens ?? 0),
            outputTokens: Number(usage.outputTokens ?? 0),
            costUsd: Number(usage.costUSD ?? obj.total_cost_usd ?? 0),
          },
        });
      } catch {
        resolve({
          verdict: { kind: "degraded", reason: "bad_rewrite" },
          usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
        });
      }
    });
  });
}

export async function runEval(preset: string, root: string): Promise<Result[]> {
  const profile = loadProfile(preset, join(root, "presets", `${preset}.md`));
  const categories: Category[] = ["should-fix", "should-pass", "edge", "adversarial"];
  const results: Result[] = [];

  process.stdout.write(`\n=== eval: ${preset} ===\n`);
  const CONCURRENCY = Number(process.env.TASTE_EVAL_CONCURRENCY ?? 6);

  for (const cat of categories) {
    const dir = join(root, "eval/fixtures", preset, cat);
    let files: string[];
    try {
      files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    } catch {
      continue;
    }
    const fixtures = files.map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as Fixture);
    for (let i = 0; i < fixtures.length; i += CONCURRENCY) {
      const batch = fixtures.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(batch.map(async (fx) => {
        const out = await judgeWithVotes(profile, fx.input);
        const correct = isCorrect(fx, out.verdict);
        process.stdout.write(`  ${cat}/${fx.id}... ${correct ? "✓" : `✗ (${out.verdict.kind})`}\n`);
        return { fixture: fx, category: cat, actual: out.verdict, correct, costUsd: out.usage.costUsd };
      }));
      results.push(...batchResults);
    }
  }
  return results;
}

// Runs the judge N times in parallel (N=TASTE_VOTES env, default 1), then
// takes the majority verdict. Ties break to "pass" (err toward trust).
// Reports aggregated cost. One retry is done per vote on transient degraded results.
async function judgeWithVotes(profile: TasteProfile, code: string): Promise<JudgeResult> {
  const n = Math.max(1, Number(process.env.TASTE_VOTES ?? 1));
  const outs = await Promise.all(Array.from({ length: n }, async () => {
    let r = await runJudgeCli(profile, code);
    if (r.verdict.kind === "degraded" && r.verdict.reason !== "timeout") {
      r = await runJudgeCli(profile, code);
    }
    return r;
  }));
  const totalCost = outs.reduce((s, o) => s + o.usage.costUsd, 0);
  const kinds = outs.map((o) => o.verdict.kind);
  const passVotes = kinds.filter((k) => k === "pass").length;
  const fixVotes = kinds.filter((k) => k === "fix").length;
  // Tie → pass.
  if (passVotes >= fixVotes) {
    const passOut = outs.find((o) => o.verdict.kind === "pass") ?? outs[0];
    return { verdict: passOut.verdict.kind === "pass" ? { kind: "pass" } : passOut.verdict, usage: { ...passOut.usage, costUsd: totalCost } };
  }
  // fix majority: pick the highest-confidence fix rewrite
  const fixOuts = outs.filter((o) => o.verdict.kind === "fix") as (JudgeResult & { verdict: Extract<Verdict, { kind: "fix" }> })[];
  const best = fixOuts.reduce((a, b) => (a.verdict.confidence >= b.verdict.confidence ? a : b));
  return { verdict: best.verdict, usage: { ...best.usage, costUsd: totalCost } };
}

function isCorrect(fx: Fixture, v: Verdict): boolean {
  // v0.1: verdict-only correctness. violationContains anchors were too brittle
  // (judge wording varies). Keep minConfidence as a soft floor when specified.
  if (fx.expect.verdict === "pass") return v.kind === "pass";
  if (fx.expect.verdict === "fix") {
    if (v.kind !== "fix") return false;
    if (fx.expect.minConfidence != null && v.confidence < fx.expect.minConfidence) return false;
    return true;
  }
  return false;
}

export interface Summary {
  byCategory: Record<Category, { total: number; correct: number; falseFix: number }>;
  totalCost: number;
  total: number;
}

export function summarize(results: Result[]): Summary {
  const byCategory = {
    "should-fix":   { total: 0, correct: 0, falseFix: 0 },
    "should-pass":  { total: 0, correct: 0, falseFix: 0 },
    "edge":         { total: 0, correct: 0, falseFix: 0 },
    "adversarial":  { total: 0, correct: 0, falseFix: 0 },
  } satisfies Summary["byCategory"];
  let totalCost = 0;
  for (const r of results) {
    const c = byCategory[r.category];
    c.total++;
    if (r.correct) c.correct++;
    if (r.category === "should-pass" && r.actual.kind === "fix") c.falseFix++;
    totalCost += r.costUsd;
  }
  return { byCategory, totalCost, total: results.length };
}

export function writeReport(preset: string, root: string, summary: Summary): string {
  mkdirSync(join(root, "eval/reports"), { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const path = join(root, "eval/reports", `${preset}-${date}.md`);
  const lines = [
    `# eval: ${preset}`,
    ``,
    `date: ${date}`,
    `total fixtures: ${summary.total}`,
    `total cost: $${summary.totalCost.toFixed(4)}`,
    ``,
    `| category | total | correct | accuracy | false-fix |`,
    `|---|---|---|---|---|`,
  ];
  for (const [cat, c] of Object.entries(summary.byCategory)) {
    const acc = c.total === 0 ? "n/a" : `${((c.correct / c.total) * 100).toFixed(1)}%`;
    lines.push(`| ${cat} | ${c.total} | ${c.correct} | ${acc} | ${c.falseFix} |`);
  }
  writeFileSync(path, lines.join("\n") + "\n");
  return path;
}

if (process.argv[1]?.endsWith("harness.js")) {
  const preset = process.argv[2] ?? "anthropic";
  const root = process.cwd();
  runEval(preset, root).then((results) => {
    const summary = summarize(results);
    const path = writeReport(preset, root, summary);
    process.stdout.write(`report: ${path}\n`);
    process.stdout.write(`total: ${summary.total}, cost: $${summary.totalCost.toFixed(4)}\n`);
  }).catch((e) => {
    process.stderr.write(`eval failed: ${e?.message ?? e}\n`);
    process.exit(1);
  });
}
