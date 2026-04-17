import { expect, test, beforeEach, afterEach } from "vitest";
import { handleEdit } from "../src/hook.js";
import type { JudgeFn } from "../src/judge.js";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "taste-hook-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const emptyProfile = `## Voice\nclean TS\n`;
const NO_USAGE = { inputTokens: 100, cachedInputTokens: 0, outputTokens: 5 };

test("T1 clean + empty rules + LLM pass => pass-through", async () => {
  writeFileSync(join(dir, "profile.md"), emptyProfile);
  const judgeFn: JudgeFn = async () => ({
    verdict: { kind: "pass" },
    usage: NO_USAGE,
  });
  const result = await handleEdit({
    tasteDir: dir,
    toolName: "Edit",
    file: "src/foo.ts",
    newContent: "const x = 1;",
    judgeFn,
  });
  expect(result.decision).toBe("approve");
  expect(result.rewrite).toBeUndefined();
});

test("LLM fix verdict returns rewrite", async () => {
  writeFileSync(join(dir, "profile.md"), emptyProfile);
  const judgeFn: JudgeFn = async () => ({
    verdict: { kind: "fix", rewrite: "const y = 2;", confidence: 0.9, violations: ["x"] },
    usage: NO_USAGE,
  });
  const res = await handleEdit({
    tasteDir: dir, toolName: "Edit", file: "src/a.ts",
    newContent: "const x = 1;", judgeFn,
  });
  expect(res.decision).toBe("approve");
  expect(res.rewrite).toBe("const y = 2;");
});

test("escalates to sonnet when haiku confidence is low in strict mode", async () => {
  writeFileSync(join(dir, "profile.md"), emptyProfile);
  let callCount = 0;
  const judgeFn: JudgeFn = async (args) => {
    callCount++;
    const isHaiku = args.model === "haiku";
    return {
      verdict: isHaiku
        ? { kind: "fix", rewrite: "low-conf fix", confidence: 0.3, violations: ["x"] }
        : { kind: "fix", rewrite: "sonnet fix", confidence: 0.95, violations: ["x"] },
      usage: NO_USAGE,
    };
  };
  const { DEFAULT_CONFIG } = await import("../src/types.js");
  const res = await handleEdit({
    tasteDir: dir, toolName: "Edit", file: "src/a.ts",
    newContent: "const x = 1;", judgeFn,
    config: { ...DEFAULT_CONFIG, mode: "strict" },
  });
  expect(callCount).toBe(2);
  expect(res.rewrite).toBe("sonnet fix");
});

test("score-only mode skips LLM", async () => {
  writeFileSync(join(dir, "profile.md"), emptyProfile);
  let called = false;
  const judgeFn: JudgeFn = async () => { called = true; throw new Error("should not be called"); };
  const { DEFAULT_CONFIG } = await import("../src/types.js");
  const cfg = { ...DEFAULT_CONFIG, mode: "score-only" as const };
  const res = await handleEdit({
    tasteDir: dir, toolName: "Edit", file: "src/a.ts",
    newContent: "const x = 1;", judgeFn, config: cfg,
  });
  expect(called).toBe(false);
  expect(res.decision).toBe("approve");
});
