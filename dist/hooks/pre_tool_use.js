import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);

// hooks/pre_tool_use.ts
import { existsSync as existsSync3, readFileSync as readFileSync3 } from "node:fs";
import { join as join2 } from "node:path";
import { stdin } from "node:process";

// src/hook.ts
import { createHash as createHash3 } from "node:crypto";
import { existsSync as existsSync2 } from "node:fs";
import { join } from "node:path";

// src/profile.ts
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
var SECTION = /^##\s+(.+)$/gm;
var BACKTICKS = /`([^`]+)`/;
function parseProfile(name, raw) {
  const sections = splitBySection(raw);
  const prose = (sections["Voice"] ?? "").trim();
  const examples = parseExamples(sections["Examples"] ?? "");
  const hardRules = parseHardRules(sections["Hard rules"] ?? "");
  return { name, prose, examples, hardRules, raw };
}
function loadProfile(name, path) {
  return parseProfile(name, readFileSync(path, "utf8"));
}
function profileHash(p) {
  return createHash("sha256").update(p.raw).digest("hex");
}
function splitBySection(raw) {
  const out = {};
  const matches = [...raw.matchAll(SECTION)];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    out[matches[i][1].trim()] = raw.slice(start, end);
  }
  return out;
}
function parseExamples(body) {
  const good = [];
  const bad = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^-\s+(good|bad):\s+(.+)$/);
    if (!m) continue;
    const code = m[2].match(BACKTICKS)?.[1] ?? m[2].trim();
    (m[1] === "good" ? good : bad).push(code);
  }
  return { good, bad };
}
function parseHardRules(body) {
  const rules = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^-\s+(banned-token|file-naming|banned-import|required-prefix):\s*(.+)$/);
    if (!m) continue;
    const [rawPattern, rawMessage] = splitOnEmDash(m[2]);
    rules.push({
      kind: m[1],
      pattern: unquote(rawPattern.trim()),
      message: rawMessage.trim().replace(/^"|"$/g, "")
    });
  }
  return rules;
}
function splitOnEmDash(s) {
  const i = s.indexOf("\u2014");
  return i >= 0 ? [s.slice(0, i), s.slice(i + 1)] : [s, ""];
}
function unquote(s) {
  if (s.length >= 2 && s.startsWith("`") && s.endsWith("`")) return s.slice(1, -1);
  return s;
}

// src/ruler.ts
import { basename, extname } from "node:path";
function checkRules(code, rules) {
  let current = code;
  const violations = [];
  let mutated = false;
  for (const rule of rules) {
    if (rule.kind === "banned-token") {
      const re = new RegExp(rule.pattern, "g");
      if (re.test(current)) {
        violations.push(rule.message || `banned token: ${rule.pattern}`);
        if (rule.fix !== void 0) {
          current = current.replace(new RegExp(rule.pattern, "g"), rule.fix);
          current = squashBlankLines(current);
          mutated = true;
        }
      }
    }
    if (rule.kind === "banned-import") {
      const re = new RegExp(`(?:from\\s+["'\`]|require\\(\\s*["'\`])${rule.pattern}`, "i");
      if (re.test(current)) {
        violations.push(rule.message || `banned import: ${rule.pattern}`);
      }
    }
  }
  return mutated ? { violations, rewrite: current } : { violations };
}
function squashBlankLines(s) {
  return s.replace(/\n\s*\n\s*\n/g, "\n\n");
}
function checkFileName(path, rules) {
  const stem = basename(path, extname(path));
  const violations = [];
  for (const r of rules) {
    if (r.kind !== "file-naming") continue;
    if (r.pattern === "snake_case" && !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(stem)) {
      violations.push(r.message || "file must be snake_case");
    }
    if (r.pattern === "kebab-case" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(stem)) {
      violations.push(r.message || "file must be kebab-case");
    }
    if (r.pattern === "camelCase" && !/^[a-z][a-zA-Z0-9]*$/.test(stem)) {
      violations.push(r.message || "file must be camelCase");
    }
  }
  return { violations };
}

// src/cache.ts
import { createHash as createHash2 } from "node:crypto";
import { existsSync, readFileSync as readFileSync2, renameSync, writeFileSync } from "node:fs";
function openCache(path, ttlDays = 30) {
  const cutoff = Date.now() - ttlDays * 864e5;
  let store = { entries: {} };
  if (existsSync(path)) {
    try {
      const parsed = JSON.parse(readFileSync2(path, "utf8"));
      if (parsed && typeof parsed === "object" && parsed.entries) {
        for (const [k, e] of Object.entries(parsed.entries)) {
          if (e && typeof e.ts === "number" && e.ts >= cutoff) store.entries[k] = e;
        }
      }
    } catch {
      try {
        renameSync(path, path + ".broken");
      } catch {
      }
      store = { entries: {} };
    }
  }
  let dirty = false;
  const flush = () => {
    if (!dirty) return;
    const tmp = path + ".tmp";
    writeFileSync(tmp, JSON.stringify(store));
    renameSync(tmp, path);
    dirty = false;
  };
  return {
    get(key) {
      return store.entries[key]?.v;
    },
    put(key, v) {
      store.entries[key] = { v, ts: Date.now() };
      dirty = true;
      flush();
    },
    close() {
      flush();
    }
  };
}
function cacheKey(profileHash2, editDiff) {
  return createHash2("sha256").update(profileHash2).update("|").update(editDiff).digest("hex");
}

// src/audit.ts
import { closeSync, openSync, writeSync } from "node:fs";
function openAudit(path) {
  const fd = openSync(path, "a");
  return {
    write(entry) {
      writeSync(fd, JSON.stringify(entry) + "\n");
    },
    close() {
      closeSync(fd);
    }
  };
}

// src/judge.ts
import { execFile } from "node:child_process";
import { appendFileSync } from "node:fs";
function debug(msg) {
  const path = process.env.TASTE_DEBUG_LOG;
  if (!path) return;
  try {
    appendFileSync(path, `[${(/* @__PURE__ */ new Date()).toISOString()}] ${msg}
`);
  } catch {
  }
}
function buildPrompt(p, code) {
  const cachedSystem = [
    "You are a strict code-style judge. Reply with ONLY valid JSON, no markdown fences, no commentary.",
    'Schema: {"verdict":"pass"|"fix","confidence":0..1,"violations":[...],"rewrite":"..."}',
    "",
    "Evaluate the user's code against the taste profile below.",
    "",
    'Return "fix" ONLY IF one of these is true:',
    "  (1) The code contains a literal pattern that a Hard rule regex would match (e.g. `banned-token: \\benum\\b` \u2192 code has a `enum` keyword).",
    '  (2) The code is structurally near-identical to a Bad example in this profile (not just "similar in spirit" \u2014 near-identical shape).',
    "",
    'Return "pass" in every other case. In particular:',
    `  - Voice prose is context for understanding the profile's aesthetic; it is NOT itself a trigger. Do not flag fix because the code "contradicts Voice".`,
    "  - Style preferences not expressed as a Hard rule or a Bad example must not trigger fix.",
    "  - When unsure, pass. Most real code will pass; only ~20% of typical code will match a violation.",
    "",
    "When returning fix, each violation must quote the specific Hard rule pattern or Bad example line it matched. If you cannot quote one, return pass.",
    "",
    "=== TASTE PROFILE ===",
    "",
    "## Voice",
    p.prose,
    "",
    "## Good examples",
    ...p.examples.good.map((e) => `- ${e}`),
    "",
    "## Bad examples",
    ...p.examples.bad.map((e) => `- ${e}`),
    "",
    "## Hard rules",
    ...p.hardRules.map((r) => `- ${r.kind}: ${r.pattern}${r.message ? ` \u2014 ${r.message}` : ""}`)
  ].join("\n");
  return { cachedSystem, userMessage: code };
}
function parseJudgeResponse(raw) {
  const cleaned = stripJsonFence(raw);
  try {
    const obj = JSON.parse(cleaned);
    if (obj.verdict === "pass") return { kind: "pass" };
    if (obj.verdict === "fix" && typeof obj.rewrite === "string") {
      return {
        kind: "fix",
        rewrite: obj.rewrite,
        confidence: Number(obj.confidence) || 0,
        violations: Array.isArray(obj.violations) ? obj.violations.map(String) : []
      };
    }
  } catch {
  }
  return { kind: "degraded", reason: "bad_rewrite" };
}
function stripJsonFence(raw) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenced) return fenced[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}
var MODEL_ALIAS = {
  haiku: "haiku",
  sonnet: "sonnet"
};
var EMPTY_USAGE = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 };
var defaultJudge = async (args) => {
  const prompt = buildPrompt(args.profile, args.code);
  const timeout = args.timeoutMs ?? 9e4;
  const claudePath = process.env.TASTE_CLAUDE_PATH ?? "claude";
  const env = sanitizeEnv();
  const t0 = Date.now();
  debug(`spawning claude (model=${args.model})`);
  return new Promise((resolve) => {
    const child = execFile(
      claudePath,
      [
        "--print",
        "--no-session-persistence",
        "--output-format",
        "json",
        "--model",
        MODEL_ALIAS[args.model],
        "--system-prompt",
        prompt.cachedSystem,
        "--disable-slash-commands",
        "--tools",
        ""
      ],
      { timeout, maxBuffer: 4 * 1024 * 1024, env },
      (err, stdout, stderr) => {
        const elapsed = Date.now() - t0;
        if (err) {
          if (err.killed || err.signal === "SIGTERM") {
            debug(`timeout after ${timeout}ms (elapsed=${elapsed}ms, got ${stdout?.length ?? 0}B stdout, ${stderr?.length ?? 0}B stderr)`);
            if (stdout) debug(`partial stdout: ${stdout.slice(0, 1e3)}`);
            if (stderr) debug(`partial stderr: ${stderr.slice(0, 1e3)}`);
            process.stderr.write(`taste judge: timeout after ${timeout}ms
`);
            resolve({ verdict: { kind: "degraded", reason: "timeout" }, usage: { ...EMPTY_USAGE } });
            return;
          }
          debug(`exec error: ${err.message}
stderr: ${stderr}
stdout: ${stdout?.slice(0, 2e3) ?? ""}`);
          process.stderr.write(`taste judge error: ${err.message}
stderr: ${stderr}
`);
          resolve({ verdict: { kind: "degraded", reason: "api_error" }, usage: { ...EMPTY_USAGE } });
          return;
        }
        try {
          const parsed = JSON.parse(stdout);
          if (parsed.is_error) {
            debug(`claude returned is_error=true: ${parsed.result ?? "(no result)"}
raw: ${stdout.slice(0, 2e3)}`);
            resolve({ verdict: { kind: "degraded", reason: "api_error" }, usage: { ...EMPTY_USAGE } });
            return;
          }
          const resultText = parsed.result ?? "";
          const u = parsed.usage ?? {};
          debug(`success: verdict in ${resultText.slice(0, 200)}`);
          resolve({
            verdict: parseJudgeResponse(resultText),
            usage: {
              inputTokens: Number(u.input_tokens ?? 0),
              cachedInputTokens: Number(u.cache_read_input_tokens ?? 0),
              outputTokens: Number(u.output_tokens ?? 0)
            }
          });
        } catch (e) {
          debug(`bad JSON: ${e?.message}
stdout: ${stdout.slice(0, 2e3)}`);
          process.stderr.write(`taste judge: bad JSON from claude -p: ${e?.message}
stdout: ${stdout.slice(0, 500)}
`);
          resolve({ verdict: { kind: "degraded", reason: "bad_rewrite" }, usage: { ...EMPTY_USAGE } });
        }
      }
    );
    child.stdin?.write(prompt.userMessage);
    child.stdin?.end();
  });
};
function sanitizeEnv() {
  const PRESERVE = /* @__PURE__ */ new Set(["CLAUDE_CODE_OAUTH_TOKEN", "CLAUDE_CODE_GIT_BASH_PATH"]);
  const out = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v === void 0) continue;
    if (PRESERVE.has(k)) {
      out[k] = v;
      continue;
    }
    if (k === "CLAUDECODE" || k.startsWith("CLAUDECODE_") || k.startsWith("CLAUDE_CODE_") || k === "MCP_SESSION_ID") continue;
    out[k] = v;
  }
  return out;
}

// src/cost.ts
var PRICES = {
  haiku: { inUsdPerM: 1, cachedInUsdPerM: 0.1, outUsdPerM: 5 },
  sonnet: { inUsdPerM: 3, cachedInUsdPerM: 0.3, outUsdPerM: 15 }
};
function costUsd(u) {
  const p = PRICES[u.model];
  const uncachedIn = Math.max(0, u.inputTokens - u.cachedInputTokens);
  return uncachedIn * p.inUsdPerM / 1e6 + u.cachedInputTokens * p.cachedInUsdPerM / 1e6 + u.outputTokens * p.outUsdPerM / 1e6;
}

// src/types.ts
var DEFAULT_CONFIG = {
  mode: "async",
  budgetUsd: 0,
  confidenceThreshold: 0.7,
  largeEditTokens: 400
};

// src/hook.ts
function handleEditT1(args) {
  const profilePath = join(args.tasteDir, "profile.md");
  if (!existsSync2(profilePath)) return { decision: "approve" };
  const profile = loadProfile("active", profilePath);
  const fileRule = checkFileName(args.file, profile.hardRules);
  const contentRule = checkRules(args.newContent, profile.hardRules);
  const workingContent = contentRule.rewrite ?? args.newContent;
  const earlyViolations = [...fileRule.violations, ...contentRule.violations];
  const beforeHash = sha256(args.newContent);
  const audit = openAudit(join(args.tasteDir, "audit.jsonl"));
  const cache = openCache(join(args.tasteDir, "cache.json"));
  const key = cacheKey(profileHash(profile), sha256(workingContent));
  const cached = cache.get(key);
  if (cached) {
    audit.write({
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      file: args.file,
      tier: "T2",
      verdict: cached.kind,
      beforeHash,
      afterHash: sha256(verdictContent(workingContent, cached))
    });
    const res = applyVerdict(workingContent, cached);
    audit.close();
    cache.close();
    return res;
  }
  audit.write({
    ts: (/* @__PURE__ */ new Date()).toISOString(),
    file: args.file,
    tier: "T1",
    verdict: earlyViolations.length > 0 ? "fix" : "pass",
    beforeHash,
    afterHash: sha256(workingContent),
    violations: earlyViolations
  });
  audit.close();
  cache.close();
  return {
    decision: "approve",
    rewrite: workingContent !== args.newContent ? workingContent : void 0
  };
}
async function handleEdit(args) {
  const config = args.config ?? DEFAULT_CONFIG;
  const judge = args.judgeFn ?? defaultJudge;
  const profilePath = join(args.tasteDir, "profile.md");
  if (!existsSync2(profilePath)) return { decision: "approve" };
  const profile = loadProfile("active", profilePath);
  const fileRule = checkFileName(args.file, profile.hardRules);
  const contentRule = checkRules(args.newContent, profile.hardRules);
  let workingContent = contentRule.rewrite ?? args.newContent;
  const earlyViolations = [...fileRule.violations, ...contentRule.violations];
  const audit = openAudit(join(args.tasteDir, "audit.jsonl"));
  const beforeHash = sha256(args.newContent);
  const cache = openCache(join(args.tasteDir, "cache.json"));
  const key = cacheKey(profileHash(profile), sha256(workingContent));
  const cached = cache.get(key);
  if (cached) {
    audit.write({
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      file: args.file,
      tier: "T2",
      verdict: cached.kind,
      beforeHash,
      afterHash: sha256(verdictContent(workingContent, cached))
    });
    const res = applyVerdict(workingContent, cached);
    audit.close();
    cache.close();
    return res;
  }
  if (config.mode === "score-only") {
    audit.write({
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      file: args.file,
      tier: "approve-passthrough",
      verdict: "pass",
      beforeHash,
      afterHash: beforeHash,
      violations: earlyViolations
    });
    audit.close();
    cache.close();
    return { decision: "approve", rewrite: workingContent !== args.newContent ? workingContent : void 0 };
  }
  const model = config.mode === "turbo" ? "sonnet" : "haiku";
  const judged = await judge({ model, profile, code: workingContent });
  const cost = costUsd({ model, ...judged.usage });
  let final = judged.verdict;
  let finalTier = model === "sonnet" ? "T3b" : "T3a";
  let totalCost = cost;
  if (config.mode === "strict" && final.kind === "fix" && final.confidence < config.confidenceThreshold) {
    const escalated = await judge({ model: "sonnet", profile, code: workingContent });
    final = escalated.verdict;
    finalTier = "T3b";
    totalCost += costUsd({ model: "sonnet", ...escalated.usage });
  }
  if (final.kind !== "degraded") cache.put(key, final);
  audit.write({
    ts: (/* @__PURE__ */ new Date()).toISOString(),
    file: args.file,
    tier: finalTier,
    verdict: final.kind,
    beforeHash,
    afterHash: sha256(verdictContent(workingContent, final)),
    tokensIn: judged.usage.inputTokens,
    tokensOut: judged.usage.outputTokens,
    costUsd: totalCost,
    violations: final.kind === "fix" ? final.violations : earlyViolations
  });
  audit.close();
  cache.close();
  return applyVerdict(workingContent, final);
}
function applyVerdict(original, v) {
  if (v.kind === "pass") return { decision: "approve", rewrite: void 0 };
  if (v.kind === "fix") return { decision: "approve", rewrite: v.rewrite };
  return { decision: "approve", reason: `degraded:${v.reason}` };
}
function verdictContent(current, v) {
  return v.kind === "fix" ? v.rewrite : current;
}
function sha256(s) {
  return createHash3("sha256").update(s).digest("hex");
}

// hooks/pre_tool_use.ts
async function readStdin() {
  const chunks = [];
  for await (const chunk of stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
var VALID_MODES = /* @__PURE__ */ new Set(["async", "strict", "score-only"]);
function loadConfig(tasteDir) {
  const cfgPath = join2(tasteDir, "config.json");
  if (!existsSync3(cfgPath)) return DEFAULT_CONFIG;
  try {
    const merged = { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync3(cfgPath, "utf8")) };
    if (!VALID_MODES.has(merged.mode)) merged.mode = DEFAULT_CONFIG.mode;
    return merged;
  } catch {
    return DEFAULT_CONFIG;
  }
}
async function main() {
  const raw = await readStdin();
  const event = JSON.parse(raw);
  const tool = event.tool_name;
  if (!["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(tool)) {
    process.stdout.write(JSON.stringify({ permissionDecision: "approve" }));
    return;
  }
  const input = event.tool_input ?? {};
  const file = input.file_path ?? input.notebook_path ?? "";
  const newContent = input.new_string ?? input.content ?? "";
  const cwd = event.cwd ?? process.cwd();
  const tasteDir = join2(cwd, ".taste");
  process.env.TASTE_DEBUG_LOG ??= join2(tasteDir, "debug.log");
  const config = loadConfig(tasteDir);
  const result = config.mode === "strict" ? await handleEdit({ tasteDir, toolName: tool, file, newContent, config }) : handleEditT1({ tasteDir, toolName: tool, file, newContent, config });
  if (result.rewrite !== void 0 && result.rewrite !== newContent) {
    const updated = { ...input };
    if ("new_string" in input) updated.new_string = result.rewrite;
    else if ("content" in input) updated.content = result.rewrite;
    process.stdout.write(JSON.stringify({
      permissionDecision: "approve",
      updatedInput: updated,
      hookSpecificOutput: { reason: "taste: hard-rule auto-fix applied" }
    }));
    return;
  }
  process.stdout.write(JSON.stringify({ permissionDecision: "approve" }));
}
main().catch((e) => {
  process.stderr.write(`taste hook error: ${e?.message ?? e}
`);
  process.stdout.write(JSON.stringify({ permissionDecision: "approve" }));
});
