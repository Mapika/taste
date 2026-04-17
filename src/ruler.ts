import { basename, extname } from "node:path";
import type { HardRule } from "./types.js";

export interface RulerResult {
  violations: string[];
  rewrite?: string;
}

export function checkRules(code: string, rules: HardRule[]): RulerResult {
  let current = code;
  const violations: string[] = [];
  let mutated = false;

  for (const rule of rules) {
    if (rule.kind === "banned-token") {
      const re = new RegExp(rule.pattern, "g");
      if (re.test(current)) {
        violations.push(rule.message || `banned token: ${rule.pattern}`);
        // Only auto-rewrite if the rule declares an explicit replacement.
        // Naively deleting banned tokens (e.g. `class` → ``) breaks syntax;
        // flag-only is safer. Contextual rewrites come from the T3 judge.
        if (rule.fix !== undefined) {
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

function squashBlankLines(s: string): string {
  return s.replace(/\n\s*\n\s*\n/g, "\n\n");
}

export function checkFileName(path: string, rules: HardRule[]): RulerResult {
  const stem = basename(path, extname(path));
  const violations: string[] = [];
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

export function checkEarlyReturns(code: string): RulerResult {
  const violations: string[] = [];
  if (/\bif\s*\([^)]+\)\s*\{[^{}]*\breturn\b[^{}]*\}\s*else\s*\{[^{}]*\breturn\b/.test(code)) {
    violations.push("prefer early return over if/else-return");
  }
  return { violations };
}
