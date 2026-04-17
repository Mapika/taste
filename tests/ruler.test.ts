import { expect, test } from "vitest";
import { checkRules, checkFileName, checkEarlyReturns } from "../src/ruler.js";
import type { HardRule } from "../src/types.js";

const noConsole: HardRule = {
  kind: "banned-token",
  pattern: "console\\.log",
  message: "no console.log",
};

test("flags banned-token without rewriting when no explicit fix", () => {
  const src = `function x() { console.log("hi"); return 1; }`;
  const out = checkRules(src, [noConsole]);
  expect(out.violations).toHaveLength(1);
  expect(out.violations[0]).toContain("no console.log");
  expect(out.rewrite).toBeUndefined();
});

test("auto-rewrites when rule provides explicit fix", () => {
  const rule: HardRule = { ...noConsole, fix: "logger.info" };
  const src = `function x() { console.log("hi"); return 1; }`;
  const out = checkRules(src, [rule]);
  expect(out.rewrite).toBeDefined();
  expect(out.rewrite).not.toContain("console.log");
  expect(out.rewrite).toContain("logger.info");
});

test("passes clean input unchanged", () => {
  const src = `function x() { return 1; }`;
  const out = checkRules(src, [noConsole]);
  expect(out.violations).toHaveLength(0);
  expect(out.rewrite).toBeUndefined();
});

test("flags banned-import", () => {
  const rule: HardRule = { kind: "banned-import", pattern: "lodash", message: "no lodash" };
  const src = `import _ from "lodash";\nexport const x = 1;`;
  const out = checkRules(src, [rule]);
  expect(out.violations[0]).toContain("no lodash");
});

test("file-naming: snake_case flags camelCase file", () => {
  const rule: HardRule = { kind: "file-naming", pattern: "snake_case", message: "use snake_case" };
  const out = checkFileName("src/userService.ts", [rule]);
  expect(out.violations).toEqual(["use snake_case"]);
});

test("file-naming: snake_case passes snake_case file", () => {
  const rule: HardRule = { kind: "file-naming", pattern: "snake_case", message: "use snake_case" };
  const out = checkFileName("src/user_service.ts", [rule]);
  expect(out.violations).toEqual([]);
});

test("suggests early returns for if/else chains", () => {
  const code = `function x(n: number) { if (n > 0) { return 1; } else { return 2; } }`;
  const out = checkEarlyReturns(code);
  expect(out.violations).toHaveLength(1);
  expect(out.violations[0]).toContain("early return");
});
