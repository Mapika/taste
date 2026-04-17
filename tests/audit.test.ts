import { expect, test, beforeEach, afterEach } from "vitest";
import { openAudit } from "../src/audit.js";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "taste-audit-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

test("appends one JSON line per entry", () => {
  const a = openAudit(join(dir, "audit.jsonl"));
  a.write({
    ts: "2026-04-16T00:00:00Z", file: "a.ts", tier: "T1",
    verdict: "fix", beforeHash: "abc", afterHash: "def",
  });
  a.write({
    ts: "2026-04-16T00:00:01Z", file: "b.ts", tier: "T3a",
    verdict: "pass", beforeHash: "111", afterHash: "111", tokensIn: 100, costUsd: 0.001,
  });
  a.close();
  const content = readFileSync(join(dir, "audit.jsonl"), "utf8");
  const lines = content.trim().split("\n");
  expect(lines).toHaveLength(2);
  expect(JSON.parse(lines[0]).tier).toBe("T1");
  expect(JSON.parse(lines[1]).tokensIn).toBe(100);
});
