import { expect, test, beforeEach, afterEach } from "vitest";
import { runCli } from "../src/cli.js";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "taste-cli-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

test("init creates .taste/ with default profile", async () => {
  await runCli(["init"], { cwd: dir });
  expect(existsSync(join(dir, ".taste/profile.md"))).toBe(true);
});

test("use <preset> copies preset into active profile", async () => {
  await runCli(["init"], { cwd: dir });
  await runCli(["use", "anthropic"], { cwd: dir, pluginRoot: process.cwd() });
  const active = readFileSync(join(dir, ".taste/profile.md"), "utf8");
  expect(active.length).toBeGreaterThan(0);
  expect(active).toContain("## Voice"); // from the anthropic preset
});
