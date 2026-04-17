import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadProfile, profileHash } from "./profile.js";
import { checkRules, checkFileName } from "./ruler.js";
import { openCache, cacheKey } from "./cache.js";
import { openAudit } from "./audit.js";
import { defaultJudge, type JudgeFn } from "./judge.js";
import { costUsd } from "./cost.js";
import { DEFAULT_CONFIG, type Config, type Verdict } from "./types.js";

export interface HandleArgs {
  tasteDir: string;
  toolName: "Edit" | "Write" | "MultiEdit" | "NotebookEdit";
  file: string;
  newContent: string;
  config?: Config;
  judgeFn?: JudgeFn;
}

export interface HandleResult {
  decision: "approve" | "block";
  rewrite?: string;
  reason?: string;
}

// Runs only T1 rules + T2 cache lookup. Synchronous, <1ms typical.
// Use this in PreToolUse (async mode) or internally before T3.
export function handleEditT1(args: HandleArgs): HandleResult {
  const profilePath = join(args.tasteDir, "profile.md");
  if (!existsSync(profilePath)) return { decision: "approve" };
  const profile = loadProfile("active", profilePath);

  const fileRule = checkFileName(args.file, profile.hardRules);
  const contentRule = checkRules(args.newContent, profile.hardRules);
  const workingContent = contentRule.rewrite ?? args.newContent;
  const earlyViolations = [...fileRule.violations, ...contentRule.violations];

  const beforeHash = sha256(args.newContent);
  const audit = openAudit(join(args.tasteDir, "audit.jsonl"));

  // Cache lookup — if a prior T3 verdict exists for this exact code, use it.
  const cache = openCache(join(args.tasteDir, "cache.json"));
  const key = cacheKey(profileHash(profile), sha256(workingContent));
  const cached = cache.get(key);
  if (cached) {
    audit.write({
      ts: new Date().toISOString(), file: args.file, tier: "T2",
      verdict: cached.kind, beforeHash, afterHash: sha256(verdictContent(workingContent, cached)),
    });
    const res = applyVerdict(workingContent, cached);
    audit.close(); cache.close();
    return res;
  }

  audit.write({
    ts: new Date().toISOString(), file: args.file, tier: "T1",
    verdict: earlyViolations.length > 0 ? "fix" : "pass",
    beforeHash, afterHash: sha256(workingContent),
    violations: earlyViolations,
  });
  audit.close(); cache.close();

  return {
    decision: "approve",
    rewrite: workingContent !== args.newContent ? workingContent : undefined,
  };
}

// Full T1 → T2 → T3 flow. Blocks on the LLM call.
// Use only in strict mode or in the background worker.
export async function handleEdit(args: HandleArgs): Promise<HandleResult> {
  const config = args.config ?? DEFAULT_CONFIG;
  const judge = args.judgeFn ?? defaultJudge;
  const profilePath = join(args.tasteDir, "profile.md");
  if (!existsSync(profilePath)) return { decision: "approve" };
  const profile = loadProfile("active", profilePath);

  const fileRule = checkFileName(args.file, profile.hardRules);
  const contentRule = checkRules(args.newContent, profile.hardRules);
  let workingContent = contentRule.rewrite ?? args.newContent;
  const earlyViolations = [...fileRule.violations, ...contentRule.violations];

  const audit = openAudit(join(args.tasteDir, "audit.jsonl"));
  const beforeHash = sha256(args.newContent);

  const cache = openCache(join(args.tasteDir, "cache.json"));
  const key = cacheKey(profileHash(profile), sha256(workingContent));
  const cached = cache.get(key);
  if (cached) {
    audit.write({
      ts: new Date().toISOString(), file: args.file, tier: "T2",
      verdict: cached.kind, beforeHash, afterHash: sha256(verdictContent(workingContent, cached)),
    });
    const res = applyVerdict(workingContent, cached);
    audit.close(); cache.close();
    return res;
  }

  if (config.mode === "score-only") {
    audit.write({
      ts: new Date().toISOString(), file: args.file, tier: "approve-passthrough",
      verdict: "pass", beforeHash, afterHash: beforeHash, violations: earlyViolations,
    });
    audit.close(); cache.close();
    return { decision: "approve", rewrite: workingContent !== args.newContent ? workingContent : undefined };
  }

  const model = config.mode === "turbo" ? "sonnet" : "haiku";
  const judged = await judge({ model, profile, code: workingContent });
  const cost = costUsd({ model, ...judged.usage });

  let final: Verdict = judged.verdict;
  let finalTier: "T3a" | "T3b" = model === "sonnet" ? "T3b" : "T3a";
  let totalCost = cost;
  if (
    config.mode === "strict" &&
    final.kind === "fix" &&
    final.confidence < config.confidenceThreshold
  ) {
    const escalated = await judge({ model: "sonnet", profile, code: workingContent });
    final = escalated.verdict;
    finalTier = "T3b";
    totalCost += costUsd({ model: "sonnet", ...escalated.usage });
  }

  if (final.kind !== "degraded") cache.put(key, final);
  audit.write({
    ts: new Date().toISOString(), file: args.file, tier: finalTier,
    verdict: final.kind, beforeHash, afterHash: sha256(verdictContent(workingContent, final)),
    tokensIn: judged.usage.inputTokens, tokensOut: judged.usage.outputTokens, costUsd: totalCost,
    violations: final.kind === "fix" ? final.violations : earlyViolations,
  });
  audit.close(); cache.close();

  return applyVerdict(workingContent, final);
}

function applyVerdict(original: string, v: Verdict): HandleResult {
  if (v.kind === "pass") return { decision: "approve", rewrite: undefined };
  if (v.kind === "fix") return { decision: "approve", rewrite: v.rewrite };
  return { decision: "approve", reason: `degraded:${v.reason}` };
}

function verdictContent(current: string, v: Verdict): string {
  return v.kind === "fix" ? v.rewrite : current;
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}
