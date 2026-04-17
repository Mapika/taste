import { expect, test } from "vitest";
import { parseProfile, profileHash } from "../src/profile.js";

const SAMPLE = `# .taste/profile.md

## Voice
We write Go-like TypeScript. Short names, early returns.

## Examples
- good: \`await db.users.get(id)\`
- bad: \`const userService = new UserService()\`

## Hard rules
- banned-token: console\\.log — "no console.log in src/**"
- file-naming: snake_case
- banned-import: lodash — "use native APIs"
`;

test("parses prose, examples, hard rules", () => {
  const p = parseProfile("anthropic", SAMPLE);
  expect(p.name).toBe("anthropic");
  expect(p.prose).toContain("Go-like TypeScript");
  expect(p.examples.good).toEqual(["await db.users.get(id)"]);
  expect(p.examples.bad).toEqual(["const userService = new UserService()"]);
  expect(p.hardRules).toHaveLength(3);
  expect(p.hardRules[0]).toEqual({
    kind: "banned-token",
    pattern: "console\\.log",
    message: "no console.log in src/**",
  });
});

test("missing required sections produces an empty but valid profile", () => {
  const p = parseProfile("bare", "# some profile\n\nno sections here");
  expect(p.prose).toBe("");
  expect(p.examples.good).toEqual([]);
  expect(p.hardRules).toEqual([]);
});

test("ignores unknown rule kinds", () => {
  const raw = `## Hard rules
- unknown-kind: something — "msg"
- banned-token: foo — "bar"
`;
  const p = parseProfile("x", raw);
  expect(p.hardRules).toHaveLength(1);
  expect(p.hardRules[0].pattern).toBe("foo");
});

test("profileHash is deterministic and changes with content", () => {
  const a = parseProfile("a", "## Voice\nhello");
  const b = parseProfile("a", "## Voice\nhello");
  const c = parseProfile("a", "## Voice\nworld");
  expect(profileHash(a)).toBe(profileHash(b));
  expect(profileHash(a)).not.toBe(profileHash(c));
  expect(profileHash(a)).toMatch(/^[0-9a-f]{64}$/);
});
