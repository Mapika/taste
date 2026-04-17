// Cost estimates assume direct-API billing. When CLAUDE_CODE_OAUTH_TOKEN is active,
// calls are billed against the Claude Code subscription plan and this USD figure is
// an informational proxy, not an actual charge.
export const PRICES = {
  haiku: { inUsdPerM: 1, cachedInUsdPerM: 0.1, outUsdPerM: 5 },
  sonnet: { inUsdPerM: 3, cachedInUsdPerM: 0.3, outUsdPerM: 15 },
} as const;

export type Model = keyof typeof PRICES;

export interface Usage {
  model: Model;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

export function costUsd(u: Usage): number {
  const p = PRICES[u.model];
  const uncachedIn = Math.max(0, u.inputTokens - u.cachedInputTokens);
  return (
    (uncachedIn * p.inUsdPerM) / 1e6 +
    (u.cachedInputTokens * p.cachedInUsdPerM) / 1e6 +
    (u.outputTokens * p.outUsdPerM) / 1e6
  );
}
