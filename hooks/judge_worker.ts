// Detached background worker. Spawned by post_tool_use.ts with a JSON job on
// argv[2]. Runs the T3 judge, appends the verdict to audit.jsonl, exits.
// Never blocks the user — the hook that spawned us already returned.
import { join } from "node:path";
import { loadProfile, profileHash } from "../src/profile.js";
import { openCache, cacheKey } from "../src/cache.js";
import { openAudit } from "../src/audit.js";
import { defaultJudge } from "../src/judge.js";
import { costUsd } from "../src/cost.js";
import { createHash } from "node:crypto";
import type { Config, Verdict } from "../src/types.js";

interface Job {
  tasteDir: string;
  file: string;
  newContent: string;
  mode: Config["mode"];
  confidenceThreshold: number;
}

async function main() {
  const raw = process.argv[2];
  if (!raw) { process.stderr.write("judge_worker: missing job arg\n"); process.exit(2); }
  const job = JSON.parse(raw) as Job;

  // Default debug log so spawn-failures are never silent.
  process.env.TASTE_DEBUG_LOG ??= join(job.tasteDir, "debug.log");

  const profileLoaded = loadProfile("active", join(job.tasteDir, "profile.md"));

  const audit = openAudit(join(job.tasteDir, "audit.jsonl"));
  const cache = openCache(join(job.tasteDir, "cache.json"));
  const beforeHash = sha256(job.newContent);
  const key = cacheKey(profileHash(profileLoaded), sha256(job.newContent));

  if (cache.get(key)) { audit.close(); cache.close(); return; }

  const model: "haiku" | "sonnet" = "haiku";
  const judged = await defaultJudge({ model, profile: profileLoaded, code: job.newContent });
  let final: Verdict = judged.verdict;
  let tier: "T3a" | "T3b" = "T3a";
  let totalCost = costUsd({ model, ...judged.usage });

  if (final.kind === "fix" && final.confidence < job.confidenceThreshold) {
    const esc = await defaultJudge({ model: "sonnet", profile: profileLoaded, code: job.newContent });
    final = esc.verdict;
    tier = "T3b";
    totalCost += costUsd({ model: "sonnet", ...esc.usage });
  }

  if (final.kind !== "degraded") cache.put(key, final);
  audit.write({
    ts: new Date().toISOString(), file: job.file, tier,
    verdict: final.kind,
    beforeHash,
    afterHash: final.kind === "fix" ? sha256(final.rewrite) : beforeHash,
    tokensIn: judged.usage.inputTokens, tokensOut: judged.usage.outputTokens, costUsd: totalCost,
    violations: final.kind === "fix" ? final.violations : [],
  });
  audit.close(); cache.close();
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

main().catch((e) => { process.stderr.write(`judge_worker error: ${e?.message ?? e}\n`); process.exit(1); });
