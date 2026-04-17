// PreToolUse: runs before Edit/Write/etc. In async mode (default) this does
// only T1 regex rules — fast, non-blocking. In strict mode it runs the full
// T1+T3 flow inline (~10s/edit). Score-only is equivalent to async T1.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stdin } from "node:process";
import { handleEdit, handleEditT1 } from "../src/hook.js";
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
    if (!VALID_MODES.has(merged.mode)) merged.mode = DEFAULT_CONFIG.mode;
    return merged;
  } catch { return DEFAULT_CONFIG; }
}

async function main() {
  const raw = await readStdin();
  const event = JSON.parse(raw);
  const tool = event.tool_name as string;
  if (!["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(tool)) {
    process.stdout.write(JSON.stringify({ permissionDecision: "approve" }));
    return;
  }
  const input = event.tool_input ?? {};
  const file = input.file_path ?? input.notebook_path ?? "";
  const newContent = input.new_string ?? input.content ?? "";
  const cwd = event.cwd ?? process.cwd();
  const tasteDir = join(cwd, ".taste");

  process.env.TASTE_DEBUG_LOG ??= join(tasteDir, "debug.log");
  const config = loadConfig(tasteDir);

  const result = config.mode === "strict"
    ? await handleEdit({ tasteDir, toolName: tool as any, file, newContent, config })
    : handleEditT1({ tasteDir, toolName: tool as any, file, newContent, config });

  if (result.rewrite !== undefined && result.rewrite !== newContent) {
    const updated = { ...input };
    if ("new_string" in input) updated.new_string = result.rewrite;
    else if ("content" in input) updated.content = result.rewrite;
    process.stdout.write(JSON.stringify({
      permissionDecision: "approve",
      updatedInput: updated,
      hookSpecificOutput: { reason: "taste: hard-rule auto-fix applied" },
    }));
    return;
  }
  process.stdout.write(JSON.stringify({ permissionDecision: "approve" }));
}

main().catch((e) => {
  process.stderr.write(`taste hook error: ${e?.message ?? e}\n`);
  process.stdout.write(JSON.stringify({ permissionDecision: "approve" }));
});
