// Shared types for taste. Kept in one file so every unit imports the same shapes.

export type HardRuleKind = "banned-token" | "file-naming" | "banned-import" | "required-prefix";

export interface HardRule {
  kind: HardRuleKind;
  pattern: string;          // regex for banned-*; literal case spec for file-naming
  message: string;
  fix?: string;             // optional literal replacement for auto-fix
}

export interface TasteProfile {
  name: string;
  prose: string;
  examples: { good: string[]; bad: string[] };
  hardRules: HardRule[];
  raw: string;              // original file contents, used in judge prompt
}

export type Verdict =
  | { kind: "pass" }
  | { kind: "fix"; rewrite: string; violations: string[]; confidence: number }
  | { kind: "degraded"; reason: "timeout" | "api_error" | "bad_rewrite" | "budget" };

export interface AuditEntry {
  ts: string;               // ISO
  file: string;
  tier: "T1" | "T2" | "T3a" | "T3b" | "approve-passthrough";
  verdict: Verdict["kind"];
  beforeHash: string;
  afterHash: string;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  violations?: string[];
}

// async: T1 inline in PreToolUse (blocking, ~1ms), T3 LLM in detached PostToolUse worker.
//        Verdicts surface via UserPromptSubmit reminders. The default.
// strict: T1 + T3 both inline in PreToolUse. Slow (~10s/edit) but judges fuzzy
//         violations before the edit commits. Opt-in.
// score-only: T1 only, no LLM ever.
export type Mode = "async" | "strict" | "score-only";

export interface Config {
  mode: Mode;
  budgetUsd: number;        // per session; 0 means unlimited
  confidenceThreshold: number; // default 0.7
  largeEditTokens: number;     // default 400
}

export const DEFAULT_CONFIG: Config = {
  mode: "async",
  budgetUsd: 0,
  confidenceThreshold: 0.7,
  largeEditTokens: 400,
};
