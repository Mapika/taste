// UserPromptSubmit: surfaces recent T3 verdicts from the background worker
// as additionalContext so Claude sees them at the top of the next turn.
// Only reports verdicts newer than .taste/last_seen.txt, then bumps the marker.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stdin } from "node:process";

interface AuditEntry {
  ts: string;
  file: string;
  tier: string;
  verdict: string;
  violations?: string[];
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const event = JSON.parse(await readStdin());
  const cwd = event.cwd ?? process.cwd();
  const tasteDir = join(cwd, ".taste");
  const auditPath = join(tasteDir, "audit.jsonl");
  const seenPath = join(tasteDir, "last_seen.txt");
  if (!existsSync(auditPath)) { process.stdout.write(JSON.stringify({})); return; }

  const lastSeen = existsSync(seenPath) ? readFileSync(seenPath, "utf8").trim() : "";
  const lines = readFileSync(auditPath, "utf8").trim().split("\n").filter(Boolean);

  const fresh: AuditEntry[] = [];
  for (const l of lines) {
    try {
      const e = JSON.parse(l) as AuditEntry;
      if (e.ts > lastSeen && (e.verdict === "fix" || e.verdict === "degraded")) fresh.push(e);
    } catch { /* skip */ }
  }

  if (fresh.length === 0) { process.stdout.write(JSON.stringify({})); return; }

  const latestTs = fresh[fresh.length - 1].ts;
  writeFileSync(seenPath, latestTs);

  const lines_out = fresh.slice(-5).map((e) => {
    if (e.verdict === "fix") {
      const viols = (e.violations ?? []).slice(0, 3).join("; ");
      return `- ${e.file} — ${viols}`;
    }
    return `- ${e.file} — judge ${e.verdict}`;
  });

  const additionalContext = [
    `## Taste verdicts (background, ${fresh.length} new)`,
    ...lines_out,
    fresh.length > 5 ? `…and ${fresh.length - 5} more in .taste/audit.jsonl` : "",
  ].filter(Boolean).join("\n");

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext },
  }));
}

main().catch((e) => {
  process.stderr.write(`taste user_prompt_submit error: ${e?.message ?? e}\n`);
  process.stdout.write(JSON.stringify({}));
});
