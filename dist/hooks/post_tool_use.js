import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);

// hooks/post_tool_use.ts
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stdin } from "node:process";

// src/judge.ts
function sanitizeEnv() {
  const PRESERVE = /* @__PURE__ */ new Set(["CLAUDE_CODE_OAUTH_TOKEN", "CLAUDE_CODE_GIT_BASH_PATH"]);
  const out = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v === void 0) continue;
    if (PRESERVE.has(k)) {
      out[k] = v;
      continue;
    }
    if (k === "CLAUDECODE" || k.startsWith("CLAUDECODE_") || k.startsWith("CLAUDE_CODE_") || k === "MCP_SESSION_ID") continue;
    out[k] = v;
  }
  return out;
}

// src/types.ts
var DEFAULT_CONFIG = {
  mode: "async",
  budgetUsd: 0,
  confidenceThreshold: 0.7,
  largeEditTokens: 400
};

// hooks/post_tool_use.ts
async function readStdin() {
  const chunks = [];
  for await (const chunk of stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
var VALID_MODES = /* @__PURE__ */ new Set(["async", "strict", "score-only"]);
function loadConfig(tasteDir) {
  const cfgPath = join(tasteDir, "config.json");
  if (!existsSync(cfgPath)) return DEFAULT_CONFIG;
  try {
    const merged = { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(cfgPath, "utf8")) };
    if (!VALID_MODES.has(merged.mode)) merged.mode = DEFAULT_CONFIG.mode;
    return merged;
  } catch {
    return DEFAULT_CONFIG;
  }
}
async function main() {
  const event = JSON.parse(await readStdin());
  const tool = event.tool_name;
  if (!["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(tool)) {
    process.stdout.write(JSON.stringify({}));
    return;
  }
  const cwd = event.cwd ?? process.cwd();
  const tasteDir = join(cwd, ".taste");
  if (!existsSync(join(tasteDir, "profile.md"))) {
    process.stdout.write(JSON.stringify({}));
    return;
  }
  const config = loadConfig(tasteDir);
  if (config.mode !== "async") {
    process.stdout.write(JSON.stringify({}));
    return;
  }
  const input = event.tool_input ?? {};
  const file = input.file_path ?? input.notebook_path ?? "";
  const newContent = input.new_string ?? input.content ?? "";
  if (!file || !newContent) {
    process.stdout.write(JSON.stringify({}));
    return;
  }
  const job = JSON.stringify({
    tasteDir,
    file,
    newContent,
    mode: config.mode,
    confidenceThreshold: config.confidenceThreshold
  });
  const workerPath = resolve(dirname(fileURLToPath(import.meta.url)), "judge_worker.js");
  const debugLog = join(tasteDir, "debug.log");
  const env = sanitizeEnv();
  env.TASTE_DEBUG_LOG = debugLog;
  try {
    const { openSync } = await import("node:fs");
    const errFd = openSync(debugLog, "a");
    const child = spawn(process.execPath, [workerPath, job], {
      detached: true,
      stdio: ["ignore", "ignore", errFd],
      env
    });
    child.unref();
  } catch (e) {
    process.stderr.write(`taste post_tool_use: failed to spawn worker: ${e?.message}
`);
  }
  process.stdout.write(JSON.stringify({}));
}
main().catch((e) => {
  process.stderr.write(`taste post_tool_use error: ${e?.message ?? e}
`);
  process.stdout.write(JSON.stringify({}));
});
