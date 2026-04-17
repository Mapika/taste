import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);

// src/cli.ts
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
var DEFAULT_PROFILE = `## Voice
Replace this with your taste profile. Try: \`/taste use anthropic\`.

## Examples
- good: \`// add examples here\`
- bad: \`// add anti-examples here\`

## Hard rules
`;
async function runCli(argv, env) {
  const [cmd, ...rest] = argv;
  const tasteDir = join(env.cwd, ".taste");
  switch (cmd) {
    case "init":
      return initCmd(tasteDir);
    case "use":
      return useCmd(tasteDir, rest[0], env.pluginRoot);
    case "stats":
      return statsCmd(tasteDir);
    case "set-mode":
      return setModeCmd(tasteDir, rest[0]);
    case "set-budget":
      return setBudgetCmd(tasteDir, Number(rest[0]));
    case "diff":
      return diffCmd(tasteDir);
    case "misfire":
      return misfireCmd(tasteDir);
    default:
      process.stderr.write(`unknown command: ${cmd}
`);
      return 2;
  }
}
function initCmd(tasteDir) {
  mkdirSync(tasteDir, { recursive: true });
  const path = join(tasteDir, "profile.md");
  if (!existsSync(path)) writeFileSync(path, DEFAULT_PROFILE);
  writeFileSync(join(tasteDir, "config.json"), JSON.stringify({ mode: "async", budgetUsd: 0 }, null, 2));
  process.stdout.write(`taste initialized at ${tasteDir}
`);
  return 0;
}
function useCmd(tasteDir, preset, pluginRoot) {
  if (!preset) {
    process.stderr.write("usage: taste use <preset>\n");
    return 2;
  }
  const root = pluginRoot ?? process.env.CLAUDE_PLUGIN_ROOT ?? defaultPluginRoot();
  const src = join(root, "presets", `${preset}.md`);
  if (!existsSync(src)) {
    process.stderr.write(`preset not found: ${src}
`);
    return 2;
  }
  mkdirSync(tasteDir, { recursive: true });
  writeFileSync(join(tasteDir, "profile.md"), readFileSync(src, "utf8"));
  process.stdout.write(`using preset: ${preset}
`);
  return 0;
}
function statsCmd(tasteDir) {
  const logPath = join(tasteDir, "audit.jsonl");
  if (!existsSync(logPath)) {
    process.stdout.write("no audit log yet\n");
    return 0;
  }
  const lines = readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean);
  const byTier = {};
  let totalCost = 0;
  for (const l of lines) {
    const e = JSON.parse(l);
    byTier[e.tier] = (byTier[e.tier] ?? 0) + 1;
    totalCost += e.costUsd ?? 0;
  }
  process.stdout.write(`edits: ${lines.length}
`);
  for (const [k, v] of Object.entries(byTier)) process.stdout.write(`  ${k}: ${v}
`);
  process.stdout.write(`total cost: $${totalCost.toFixed(4)}
`);
  return 0;
}
function setModeCmd(tasteDir, mode) {
  const valid = ["async", "strict", "score-only"];
  if (!mode || !valid.includes(mode)) {
    process.stderr.write(`usage: taste set-mode ${valid.join("|")}
`);
    return 2;
  }
  const cfgPath = join(tasteDir, "config.json");
  const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, "utf8")) : {};
  cfg.mode = mode;
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  process.stdout.write(`mode set to ${mode}
`);
  return 0;
}
function setBudgetCmd(tasteDir, usd) {
  if (!Number.isFinite(usd) || usd < 0) {
    process.stderr.write("usage: taste set-budget <positive number in USD>\n");
    return 2;
  }
  const cfgPath = join(tasteDir, "config.json");
  const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, "utf8")) : {};
  cfg.budgetUsd = usd;
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  process.stdout.write(`budget set to $${usd}/session
`);
  return 0;
}
function diffCmd(tasteDir) {
  const logPath = join(tasteDir, "audit.jsonl");
  if (!existsSync(logPath)) {
    process.stdout.write("no audit log yet\n");
    return 0;
  }
  const lines = readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean).slice(-20);
  for (const l of lines) {
    const e = JSON.parse(l);
    if (e.verdict === "fix") {
      process.stdout.write(`${e.ts}  ${e.file}  [${e.tier}]  ${(e.violations ?? []).join("; ")}
`);
    }
  }
  return 0;
}
function misfireCmd(_tasteDir) {
  process.stdout.write(
    "flag the most recent rewrite as a misfire. opens a GitHub issue with the (profile, before, after) tuple.\n"
  );
  return 0;
}
function defaultPluginRoot() {
  try {
    return resolve(dirname(fileURLToPath(import.meta.url)), "..");
  } catch {
    return ".";
  }
}
if (process.argv[1]?.endsWith("cli.js")) {
  runCli(process.argv.slice(2), { cwd: process.cwd() }).then((code) => process.exit(code));
}
export {
  runCli
};
