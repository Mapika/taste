# taste

> Your code. Your taste.

`taste` makes every Claude edit match your house style — or Carmack's, or Linus's, or DHH's — so terse codebases stay terse and ornate ones stay ornate.

## Install

```bash
claude plugin marketplace add Mapika/taste && claude plugin install taste@taste
```

No separate API key required — `taste` runs on your Claude Code subscription.

## Pick a taste

Eight presets ship out of the box. One command switches.

| Preset | Vibe | Best for |
|---|---|---|
| `anthropic` | Terse TypeScript, typed error hierarchy, full-word names, no barrel exports | TS backend work |
| `carmack` | Functions over classes, crash-on-failure, short names, zero ceremony | Performance-critical code, game engines, low-level libs |
| `linus` | Flat, boring, obvious. `snake_case`, no CamelCase, 8-space tabs, 80 cols, `goto` for cleanup | Systems code, kernel-adjacent work |
| `dhh` | Ornate, English-flavored DSLs, convention over config, metaprogramming is fine | Rails apps, writer-experience optimization |
| `fowler` | Long intention-revealing names, Extract Method, patterns by name, no anemic models | Enterprise OO, Java/.NET shops |
| `dan-abramov` | Hooks over classes, small composable functions, explicit data flow | React apps |
| `37signals` | Lean deps, narrow files, human copy, good READMEs | Small-team OSS, writer-friendly code |
| `google-go` | Short names in short scopes, errors as values, `gofmt`, table-driven tests | Go services |

```
/taste:use carmack      # switch active profile
/taste:learn            # distill a profile from THIS repo
```

## How it works

`taste` wires up three Claude Code hooks:

1. **`PreToolUse`** (on Edit/Write) runs your profile's regex and file-name rules inline. <1 ms, never blocks. Flags banned tokens and — when a rule declares an explicit `fix:` replacement — rewrites before the edit lands.
2. **`PostToolUse`** spawns a detached worker that calls `claude -p` with your profile as the system prompt, gets a verdict from Haiku (escalating to Sonnet on low confidence in `strict` mode), and appends to `.taste/audit.jsonl`. Takes ~10–15 s — but detached, so the user is never waiting.
3. **`UserPromptSubmit`** reads fresh audit entries and emits them as `additionalContext` on your next turn. Claude sees `## Taste verdicts (background, 2 new)` at the top of its context and can act on them.

A SHA-256 verdict cache in `.taste/cache.json` means identical edits skip the LLM entirely. `/taste:stats` summarizes the session. `/taste:diff` lists the last 20 rewrites. `/taste:misfire` flags a false fix for the profile gallery.

## Modes

```
/taste:set-mode async       # default — T1 inline, T3 in background
/taste:set-mode strict      # T1 + T3 both inline; user waits ~15 s per edit
/taste:set-mode score-only  # regex rules only, no LLM calls ever
```

- `async` is the default. Edits land instantly; LLM verdicts surface on the next prompt.
- `strict` blocks on the LLM judge so rewrites apply before the edit commits. Slow, but catches fuzzy violations pre-landing.
- `score-only` is a hard-rule firewall with no LLM cost.

## Cost

On a Claude Code subscription: **$0** — all calls route through your plan.

Direct-API billing: a Haiku judge runs ~$0.005–$0.01 per edit. Typical 50-edit session is ~$0.25–$0.50. The verdict cache means repeats are free. Track per-session cost with `/taste:stats`.

`/taste:set-budget <usd>` records a budget intent in `.taste/config.json`. Enforcement (auto-downgrade to `score-only` when hit) is not yet wired — use `/taste:stats` to watch spend for now.

## Does it work?

Evaluated against **400 hand-curated fixtures** (50 per preset) — `should-fix`, `should-pass`, edge, and adversarial. Judge runs Haiku 3-vote majority; verdicts below are verdict-accuracy.

| preset       | overall | should-fix | should-pass | false-fix |
|--------------|:-------:|:----------:|:-----------:|:---------:|
| `anthropic`  |  98%    |   100%     |    100%     |     0     |
| `dhh`        |  96%    |   100%     |    100%     |     0     |
| `google-go`  |  94%    |   85%      |    100%     |     0     |
| `fowler`     |  88%    |   75%      |    93%      |     1     |
| `linus`      |  84%    |   80%      |    93%      |     1     |
| `carmack`    |  80%    |   80%      |    100%     |     0     |
| `dan-abramov`|  78%    |   50%      |    100%     |     0     |
| `37signals`  |  76%    |   65%      |    100%     |     0     |
| **Aggregate**| **87%** |   **79%**  |   **98.3%** |   **2**   |

**Trust-critical number: 0.5% false-fix rate (2 of 400).** If your code is already clean, `taste` almost never rewrites it wrong.

Run the eval yourself: `node dist/eval/harness.js <preset>`. Reports drop into `eval/reports/`.

## Add your own preset

See `presets/SOURCES.md` for the template. The quality bar:

- Cite ≥20 real snippets in `presets/<name>.corpus.md` with URLs
- Hit ≥95% style-compliance on your fixture set
- <5% false-fix rate on should-pass fixtures

## License

MIT.
