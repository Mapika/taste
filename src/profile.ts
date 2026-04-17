import type { HardRule, TasteProfile } from "./types.js";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const SECTION = /^##\s+(.+)$/gm;
const BACKTICKS = /`([^`]+)`/;

export function parseProfile(name: string, raw: string): TasteProfile {
  const sections = splitBySection(raw);
  const prose = (sections["Voice"] ?? "").trim();
  const examples = parseExamples(sections["Examples"] ?? "");
  const hardRules = parseHardRules(sections["Hard rules"] ?? "");
  return { name, prose, examples, hardRules, raw };
}

export function loadProfile(name: string, path: string): TasteProfile {
  return parseProfile(name, readFileSync(path, "utf8"));
}

export function profileHash(p: TasteProfile): string {
  return createHash("sha256").update(p.raw).digest("hex");
}

function splitBySection(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const matches = [...raw.matchAll(SECTION)];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : raw.length;
    out[matches[i][1].trim()] = raw.slice(start, end);
  }
  return out;
}

function parseExamples(body: string): { good: string[]; bad: string[] } {
  const good: string[] = [];
  const bad: string[] = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^-\s+(good|bad):\s+(.+)$/);
    if (!m) continue;
    const code = m[2].match(BACKTICKS)?.[1] ?? m[2].trim();
    (m[1] === "good" ? good : bad).push(code);
  }
  return { good, bad };
}

function parseHardRules(body: string): HardRule[] {
  const rules: HardRule[] = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^-\s+(banned-token|file-naming|banned-import|required-prefix):\s*(.+)$/);
    if (!m) continue;
    const [rawPattern, rawMessage] = splitOnEmDash(m[2]);
    rules.push({
      kind: m[1] as HardRule["kind"],
      pattern: unquote(rawPattern.trim()),
      message: rawMessage.trim().replace(/^"|"$/g, ""),
    });
  }
  return rules;
}

function splitOnEmDash(s: string): [string, string] {
  const i = s.indexOf("—");
  return i >= 0 ? [s.slice(0, i), s.slice(i + 1)] : [s, ""];
}

function unquote(s: string): string {
  // Patterns are often written `\bclass\b` in markdown — strip surrounding backticks.
  if (s.length >= 2 && s.startsWith("`") && s.endsWith("`")) return s.slice(1, -1);
  return s;
}
