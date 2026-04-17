---
name: submit
description: Help PR a new preset to the upstream taste repo
---

Goal: scaffold a preset PR using the current `.taste/profile.md`.

Steps:
1. Read `.taste/profile.md`.
2. Copy into `presets/_draft/<slug>.md` (ask the user for the slug).
3. Create `presets/_draft/<slug>.corpus.md` and `presets/_draft/<slug>.showcase.md` as stubs with section headers.
4. Print the PR checklist from the project spec (§10 of `docs/superpowers/specs/2026-04-16-taste-design.md`).
5. Open a draft PR on `Mapika/taste` with the scaffolded files.
