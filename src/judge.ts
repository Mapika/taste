// Judge spawns the `claude` CLI (Claude Code) as a subprocess.
// `claude -p --output-format json` gives us a one-shot JSON response
// using the user's inherited auth — subscription OAuth or ANTHROPIC_API_KEY.
//
// Notes on recursion: `--tools ""` disables all tools, so PreToolUse hooks
// (including this plugin's own) never fire inside the inner claude session.
// `--system-prompt` fully replaces the default system prompt, so CLAUDE.md
// content and dynamic per-machine sections are excluded.
// We don't use `--bare` because it disables OAuth/keychain auth and requires
// ANTHROPIC_API_KEY — defeating the "works out of the box" goal.
import { execFile } from "node:child_process";
import { appendFileSync } from "node:fs";
import type { TasteProfile, Verdict } from "./types.js";
import type { Model } from "./cost.js";

function debug(msg: string): void {
  const path = process.env.TASTE_DEBUG_LOG;
  if (!path) return;
  try { appendFileSync(path, `[${new Date().toISOString()}] ${msg}\n`); } catch {}
}

export interface Prompt {
  cachedSystem: string;
  userMessage: string;
}

export function buildPrompt(p: TasteProfile, code: string): Prompt {
  const cachedSystem = [
    "You are a strict code-style judge. Reply with ONLY valid JSON, no markdown fences, no commentary.",
    "Schema: {\"verdict\":\"pass\"|\"fix\",\"confidence\":0..1,\"violations\":[...],\"rewrite\":\"...\"}",
    "",
    "Evaluate the user's code against the taste profile below.",
    "",
    "Return \"fix\" ONLY IF one of these is true:",
    "  (1) The code contains a literal pattern that a Hard rule regex would match (e.g. `banned-token: \\benum\\b` → code has a `enum` keyword).",
    "  (2) The code is structurally near-identical to a Bad example in this profile (not just \"similar in spirit\" — near-identical shape).",
    "",
    "Return \"pass\" in every other case. In particular:",
    "  - Voice prose is context for understanding the profile's aesthetic; it is NOT itself a trigger. Do not flag fix because the code \"contradicts Voice\".",
    "  - Style preferences not expressed as a Hard rule or a Bad example must not trigger fix.",
    "  - When unsure, pass. Most real code will pass; only ~20% of typical code will match a violation.",
    "",
    "When returning fix, each violation must quote the specific Hard rule pattern or Bad example line it matched. If you cannot quote one, return pass.",
    "",
    "=== TASTE PROFILE ===",
    "",
    "## Voice",
    p.prose,
    "",
    "## Good examples",
    ...p.examples.good.map((e) => `- ${e}`),
    "",
    "## Bad examples",
    ...p.examples.bad.map((e) => `- ${e}`),
    "",
    "## Hard rules",
    ...p.hardRules.map((r) => `- ${r.kind}: ${r.pattern}${r.message ? ` — ${r.message}` : ""}`),
  ].join("\n");

  return { cachedSystem, userMessage: code };
}

export function parseJudgeResponse(raw: string): Verdict {
  const cleaned = stripJsonFence(raw);
  try {
    const obj = JSON.parse(cleaned);
    if (obj.verdict === "pass") return { kind: "pass" };
    if (obj.verdict === "fix" && typeof obj.rewrite === "string") {
      return {
        kind: "fix",
        rewrite: obj.rewrite,
        confidence: Number(obj.confidence) || 0,
        violations: Array.isArray(obj.violations) ? obj.violations.map(String) : [],
      };
    }
  } catch { /* fallthrough */ }
  return { kind: "degraded", reason: "bad_rewrite" };
}

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenced) return fenced[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

const MODEL_ALIAS: Record<Model, string> = {
  haiku: "haiku",
  sonnet: "sonnet",
};

export interface JudgeArgs {
  model: Model;
  profile: TasteProfile;
  code: string;
  timeoutMs?: number;
}

export interface JudgeOutput {
  verdict: Verdict;
  usage: { inputTokens: number; cachedInputTokens: number; outputTokens: number };
}

export type JudgeFn = (args: JudgeArgs) => Promise<JudgeOutput>;

const EMPTY_USAGE = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 };

export const defaultJudge: JudgeFn = async (args) => {
  const prompt = buildPrompt(args.profile, args.code);
  // 90s default — the judge runs detached from the user in async mode, so a
  // long ceiling costs nothing. Strict mode can override via JudgeArgs.
  const timeout = args.timeoutMs ?? 90_000;
  const claudePath = process.env.TASTE_CLAUDE_PATH ?? "claude";

  const env = sanitizeEnv();

  const t0 = Date.now();
  debug(`spawning claude (model=${args.model})`);

  return new Promise<JudgeOutput>((resolve) => {
    // Prompt goes on stdin to avoid `--tools <tools...>` (variadic) consuming it
    // as an extra tool name when we pass it positionally.
    const child = execFile(
      claudePath,
      [
        "--print",
        "--no-session-persistence",
        "--output-format", "json",
        "--model", MODEL_ALIAS[args.model],
        "--system-prompt", prompt.cachedSystem,
        "--disable-slash-commands",
        "--tools", "",
      ],
      { timeout, maxBuffer: 4 * 1024 * 1024, env },
      (err, stdout, stderr) => {
        const elapsed = Date.now() - t0;
        if (err) {
          if ((err as any).killed || (err as any).signal === "SIGTERM") {
            debug(`timeout after ${timeout}ms (elapsed=${elapsed}ms, got ${stdout?.length ?? 0}B stdout, ${stderr?.length ?? 0}B stderr)`);
            if (stdout) debug(`partial stdout: ${stdout.slice(0, 1000)}`);
            if (stderr) debug(`partial stderr: ${stderr.slice(0, 1000)}`);
            process.stderr.write(`taste judge: timeout after ${timeout}ms\n`);
            resolve({ verdict: { kind: "degraded", reason: "timeout" }, usage: { ...EMPTY_USAGE } });
            return;
          }
          debug(`exec error: ${err.message}\nstderr: ${stderr}\nstdout: ${stdout?.slice(0, 2000) ?? ""}`);
          process.stderr.write(`taste judge error: ${err.message}\nstderr: ${stderr}\n`);
          resolve({ verdict: { kind: "degraded", reason: "api_error" }, usage: { ...EMPTY_USAGE } });
          return;
        }
        try {
          const parsed = JSON.parse(stdout);
          if (parsed.is_error) {
            debug(`claude returned is_error=true: ${parsed.result ?? "(no result)"}\nraw: ${stdout.slice(0, 2000)}`);
            resolve({ verdict: { kind: "degraded", reason: "api_error" }, usage: { ...EMPTY_USAGE } });
            return;
          }
          const resultText: string = parsed.result ?? "";
          const u = parsed.usage ?? {};
          debug(`success: verdict in ${resultText.slice(0, 200)}`);
          resolve({
            verdict: parseJudgeResponse(resultText),
            usage: {
              inputTokens: Number(u.input_tokens ?? 0),
              cachedInputTokens: Number(u.cache_read_input_tokens ?? 0),
              outputTokens: Number(u.output_tokens ?? 0),
            },
          });
        } catch (e: any) {
          debug(`bad JSON: ${e?.message}\nstdout: ${stdout.slice(0, 2000)}`);
          process.stderr.write(`taste judge: bad JSON from claude -p: ${e?.message}\nstdout: ${stdout.slice(0, 500)}\n`);
          resolve({ verdict: { kind: "degraded", reason: "bad_rewrite" }, usage: { ...EMPTY_USAGE } });
        }
      }
    );
    child.stdin?.write(prompt.userMessage);
    child.stdin?.end();
  });
};

export async function runJudge(args: JudgeArgs): Promise<JudgeOutput> {
  return defaultJudge(args);
}

// Strip parent Claude Code session markers so the spawned `claude` treats
// itself as a fresh top-level session. Preserve the OAuth token so the child
// can authenticate against the user's subscription. Pattern from
// thedotmack/claude-mem (env-sanitizer.ts + EnvManager.ts).
export function sanitizeEnv(): NodeJS.ProcessEnv {
  const PRESERVE = new Set(["CLAUDE_CODE_OAUTH_TOKEN", "CLAUDE_CODE_GIT_BASH_PATH"]);
  const out: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v === undefined) continue;
    if (PRESERVE.has(k)) { out[k] = v; continue; }
    if (k === "CLAUDECODE" || k.startsWith("CLAUDECODE_") || k.startsWith("CLAUDE_CODE_") || k === "MCP_SESSION_ID") continue;
    out[k] = v;
  }
  return out;
}
