import { expect, test, beforeEach, afterEach } from "vitest";
import { openCache } from "../src/cache.js";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "taste-cache-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

test("put and get a pass verdict", () => {
  const c = openCache(join(dir, "cache.json"));
  c.put("key1", { kind: "pass" });
  expect(c.get("key1")).toEqual({ kind: "pass" });
  c.close();
});

test("put and get a fix verdict with rewrite", () => {
  const c = openCache(join(dir, "cache.json"));
  c.put("key2", { kind: "fix", rewrite: "hi", violations: ["x"], confidence: 0.9 });
  expect(c.get("key2")).toEqual({ kind: "fix", rewrite: "hi", violations: ["x"], confidence: 0.9 });
  c.close();
});

test("returns undefined for missing key", () => {
  const c = openCache(join(dir, "cache.json"));
  expect(c.get("missing")).toBeUndefined();
  c.close();
});

import { writeFileSync } from "node:fs";

test("recovers from a corrupted file by renaming and re-creating", () => {
  const path = join(dir, "cache.json");
  writeFileSync(path, "not valid json {");
  const c = openCache(path);
  expect(c.get("x")).toBeUndefined();
  c.put("x", { kind: "pass" });
  expect(c.get("x")).toEqual({ kind: "pass" });
  c.close();
});
