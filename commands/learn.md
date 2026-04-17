---
name: learn
description: Distill a taste profile from the current repo
---

Goal: write `.taste/profile.md` that captures the existing codebase's taste.

Steps:
1. Skim 20 representative source files across `src/`, `lib/`, `app/` (prefer recently-modified, non-trivial files).
2. Identify patterns: naming, structure, error handling, abstraction level, comment style, import patterns.
3. Write `.taste/profile.md` with three sections: `## Voice` (1–2 paragraphs), `## Examples` (10 good + 10 bad `- good:` / `- bad:` bullets with backtick-quoted code), and `## Hard rules` (banned tokens, file-naming, banned imports — only the ones the codebase clearly already enforces).
4. Print a short summary of the voice captured.

Do NOT invent rules the code doesn't show. When in doubt, leave it out.
