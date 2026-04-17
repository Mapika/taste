// Runs after every matched tool use. Dispatches a detached worker to run the
// T3 LLM judge in the background and exits immediately — the user is never
// blocked waiting for inference. Verdicts land in audit.jsonl and surface on
// the next UserPromptSubmit.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stdin } from "node:process";
import { sanitizeEnv } from "../src/judge.js";
import { DEFAULT_CONFIG, type Config } from "../src/types.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

const VALID_MODES = new Set(["async", "strict", "score-only"]);

function loadConfig(tasteDir: string): Config {
  const cfgPath = join(tasteDir, "config.json");
  if (!existsSync(cfgPath)) return DEFAULT_CONFIG;
  try {
    const merged = { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(cfgPath, "utf8")) };
    // Migrate unknown/legacy modes (e.g. pre-rename "default"/"eco"/"turbo") to async.
    if (!VALID_MODES.has(merged.mode)) merged.mode = DEFAULT_CONFIG.mode;
    return merged;
  } catch { return DEFAULT_CONFIG; }
}

async function main() {
  const event = JSON.parse(await readStdin());
  const tool = event.tool_name as string;
  if (!["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(tool)) {
    process.stdout.write(JSON.stringify({}));
    return;
  }

  const cwd = event.cwd ?? process.cwd();
  const tasteDir = join(cwd, ".taste");
  if (!existsSync(join(tasteDir, "profile.md"))) {
    process.stdout.write(JSON.stringify({})); return;
  }

  const config = loadConfig(tasteDir);
  // In strict mode the PreToolUse hook already did inline T3 — don't duplicate.
  // In score-only mode there's no T3 at all.
  if (config.mode !== "async") { process.stdout.write(JSON.stringify({})); return; }

  const input = event.tool_input ?? {};
  const file = input.file_path ?? input.notebook_path ?? "";
  const newContent = input.new_string ?? input.content ?? "";
  if (!file || !newContent) { process.stdout.write(JSON.stringify({})); return; }

  const job = JSON.stringify({
    tasteDir,
    file,
    newContent,
    mode: config.mode,
    confidenceThreshold: config.confidenceThreshold,
  });

  const workerPath = resolve(dirname(fileURLToPath(import.meta.url)), "judge_worker.js");
  const debugLog = join(tasteDir, "debug.log");
  const env = sanitizeEnv();
  env.TASTE_DEBUG_LOG = debugLog;

  try {
    // stderr goes to debug.log so spawn/load failures are inspectable.
    const { openSync } = await import("node:fs");
    const errFd = openSync(debugLog, "a");
    const child = spawn(process.execPath, [workerPath, job], {
      detached: true,
      stdio: ["ignore", "ignore", errFd],
      env,
    });
    child.unref();
  } catch (e: any) {
    process.stderr.write(`taste post_tool_use: failed to spawn worker: ${e?.message}\n`);
  }

  process.stdout.write(JSON.stringify({}));
}

main().catch((e) => {
  process.stderr.write(`taste post_tool_use error: ${e?.message ?? e}\n`);
  process.stdout.write(JSON.stringify({}));
});
