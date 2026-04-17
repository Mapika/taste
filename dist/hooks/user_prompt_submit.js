import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);

// hooks/user_prompt_submit.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stdin } from "node:process";
async function readStdin() {
  const chunks = [];
  for await (const chunk of stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
async function main() {
  const event = JSON.parse(await readStdin());
  const cwd = event.cwd ?? process.cwd();
  const tasteDir = join(cwd, ".taste");
  const auditPath = join(tasteDir, "audit.jsonl");
  const seenPath = join(tasteDir, "last_seen.txt");
  if (!existsSync(auditPath)) {
    process.stdout.write(JSON.stringify({}));
    return;
  }
  const lastSeen = existsSync(seenPath) ? readFileSync(seenPath, "utf8").trim() : "";
  const lines = readFileSync(auditPath, "utf8").trim().split("\n").filter(Boolean);
  const fresh = [];
  for (const l of lines) {
    try {
      const e = JSON.parse(l);
      if (e.ts > lastSeen && (e.verdict === "fix" || e.verdict === "degraded")) fresh.push(e);
    } catch {
    }
  }
  if (fresh.length === 0) {
    process.stdout.write(JSON.stringify({}));
    return;
  }
  const latestTs = fresh[fresh.length - 1].ts;
  writeFileSync(seenPath, latestTs);
  const lines_out = fresh.slice(-5).map((e) => {
    if (e.verdict === "fix") {
      const viols = (e.violations ?? []).slice(0, 3).join("; ");
      return `- ${e.file} \u2014 ${viols}`;
    }
    return `- ${e.file} \u2014 judge ${e.verdict}`;
  });
  const additionalContext = [
    `## Taste verdicts (background, ${fresh.length} new)`,
    ...lines_out,
    fresh.length > 5 ? `\u2026and ${fresh.length - 5} more in .taste/audit.jsonl` : ""
  ].filter(Boolean).join("\n");
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext }
  }));
}
main().catch((e) => {
  process.stderr.write(`taste user_prompt_submit error: ${e?.message ?? e}
`);
  process.stdout.write(JSON.stringify({}));
});
