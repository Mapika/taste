import { expect, test } from "vitest";
import { buildPrompt, parseJudgeResponse } from "../src/judge.js";
import type { TasteProfile } from "../src/types.js";

const profile: TasteProfile = {
  name: "anthropic",
  prose: "terse TypeScript",
  examples: { good: ["await db.get(id)"], bad: ["new UserService()"] },
  hardRules: [],
  raw: "## Voice\nterse TypeScript\n",
};

test("buildPrompt separates profile (cacheable) from edit (non-cacheable)", () => {
  const p = buildPrompt(profile, "some new code");
  expect(p.cachedSystem).toContain("terse TypeScript");
  expect(p.cachedSystem).toContain("await db.get(id)");
  expect(p.userMessage).toBe("some new code");
  expect(p.cachedSystem).not.toContain("some new code");
});

test("parses a pass response", () => {
  const r = parseJudgeResponse('{"verdict":"pass","confidence":0.95,"violations":[]}');
  expect(r.kind).toBe("pass");
});

test("parses a fix response with rewrite", () => {
  const r = parseJudgeResponse(
    '{"verdict":"fix","confidence":0.88,"violations":["logs"],"rewrite":"ok"}'
  );
  expect(r.kind).toBe("fix");
  if (r.kind === "fix") {
    expect(r.rewrite).toBe("ok");
    expect(r.confidence).toBe(0.88);
    expect(r.violations).toEqual(["logs"]);
  }
});

test("garbled response returns degraded", () => {
  const r = parseJudgeResponse("not json at all");
  expect(r.kind).toBe("degraded");
});

test("parses JSON wrapped in a fenced code block", () => {
  const r = parseJudgeResponse('```json\n{"verdict":"pass"}\n```');
  expect(r.kind).toBe("pass");
});

test("parses JSON wrapped in commentary text", () => {
  const r = parseJudgeResponse('Here is the verdict: {"verdict":"pass"} hope that helps.');
  expect(r.kind).toBe("pass");
});
