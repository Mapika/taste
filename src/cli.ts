import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface CliEnv {
  cwd: string;
  pluginRoot?: string;
}

const DEFAULT_PROFILE = `## Voice
Replace this with your taste profile. Try: \`/taste use anthropic\`.

## Examples
- good: \`// add examples here\`
- bad: \`// add anti-examples here\`

## Hard rules
`;

export async function runCli(argv: string[], env: CliEnv): Promise<number> {
  const [cmd, ...rest] = argv;
  const tasteDir = join(env.cwd, ".taste");
  switch (cmd) {
    case "init": return initCmd(tasteDir);
    case "use": return useCmd(tasteDir, rest[0], env.pluginRoot);
    case "stats": return statsCmd(tasteDir);
    case "set-mode": return setModeCmd(tasteDir, rest[0]);
    case "set-budget": return setBudgetCmd(tasteDir, Number(rest[0]));
    case "diff": return diffCmd(tasteDir);
    case "misfire": return misfireCmd(tasteDir);
    default:
      process.stderr.write(`unknown command: ${cmd}\n`);
      return 2;
  }
}

function initCmd(tasteDir: string): number {
  mkdirSync(tasteDir, { recursive: true });
  const path = join(tasteDir, "profile.md");
  if (!existsSync(path)) writeFileSync(path, DEFAULT_PROFILE);
  writeFileSync(join(tasteDir, "config.json"), JSON.stringify({ mode: "async", budgetUsd: 0 }, null, 2));
  process.stdout.write(`taste initialized at ${tasteDir}\n`);
  return 0;
}

function useCmd(tasteDir: string, preset: string | undefined, pluginRoot?: string): number {
  if (!preset) { process.stderr.write("usage: taste use <preset>\n"); return 2; }
  const root = pluginRoot ?? process.env.CLAUDE_PLUGIN_ROOT ?? defaultPluginRoot();
  const src = join(root, "presets", `${preset}.md`);
  if (!existsSync(src)) {
    process.stderr.write(`preset not found: ${src}\n`);
    return 2;
  }
  mkdirSync(tasteDir, { recursive: true });
  writeFileSync(join(tasteDir, "profile.md"), readFileSync(src, "utf8"));
  process.stdout.write(`using preset: ${preset}\n`);
  return 0;
}

function statsCmd(tasteDir: string): number {
  const logPath = join(tasteDir, "audit.jsonl");
  if (!existsSync(logPath)) { process.stdout.write("no audit log yet\n"); return 0; }
  const lines = readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean);
  const byTier: Record<string, number> = {};
  let totalCost = 0;
  for (const l of lines) {
    const e = JSON.parse(l);
    byTier[e.tier] = (byTier[e.tier] ?? 0) + 1;
    totalCost += e.costUsd ?? 0;
  }
  process.stdout.write(`edits: ${lines.length}\n`);
  for (const [k, v] of Object.entries(byTier)) process.stdout.write(`  ${k}: ${v}\n`);
  process.stdout.write(`total cost: $${totalCost.toFixed(4)}\n`);
  return 0;
}

function setModeCmd(tasteDir: string, mode: string | undefined): number {
  const valid = ["async", "strict", "score-only"];
  if (!mode || !valid.includes(mode)) {
    process.stderr.write(`usage: taste set-mode ${valid.join("|")}\n`); return 2;
  }
  const cfgPath = join(tasteDir, "config.json");
  const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, "utf8")) : {};
  cfg.mode = mode;
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  process.stdout.write(`mode set to ${mode}\n`);
  return 0;
}

function setBudgetCmd(tasteDir: string, usd: number): number {
  if (!Number.isFinite(usd) || usd < 0) {
    process.stderr.write("usage: taste set-budget <positive number in USD>\n"); return 2;
  }
  const cfgPath = join(tasteDir, "config.json");
  const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, "utf8")) : {};
  cfg.budgetUsd = usd;
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  process.stdout.write(`budget set to $${usd}/session\n`);
  return 0;
}

function diffCmd(tasteDir: string): number {
  const logPath = join(tasteDir, "audit.jsonl");
  if (!existsSync(logPath)) { process.stdout.write("no audit log yet\n"); return 0; }
  const lines = readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean).slice(-20);
  for (const l of lines) {
    const e = JSON.parse(l);
    if (e.verdict === "fix") {
      process.stdout.write(`${e.ts}  ${e.file}  [${e.tier}]  ${(e.violations ?? []).join("; ")}\n`);
    }
  }
  return 0;
}

function misfireCmd(_tasteDir: string): number {
  process.stdout.write(
    "flag the most recent rewrite as a misfire. opens a GitHub issue with the (profile, before, after) tuple.\n"
  );
  return 0;
}

// Resolve plugin root from the compiled file's location: <root>/dist/cli.js → <root>
function defaultPluginRoot(): string {
  try { return resolve(dirname(fileURLToPath(import.meta.url)), ".."); }
  catch { return "."; }
}

// When invoked directly as bin (node dist/cli.js ...)
if (process.argv[1]?.endsWith("cli.js")) {
  runCli(process.argv.slice(2), { cwd: process.cwd() }).then((code) => process.exit(code));
}
