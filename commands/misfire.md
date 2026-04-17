---
name: misfire
description: Flag the most recent rewrite as wrong
---

Run: `node ${CLAUDE_PLUGIN_ROOT}/dist/cli.js misfire`

Then: if a recent `fix`-verdict audit entry exists, offer to open a GitHub issue on `Mapika/taste` with the profile name, the before/after pair, and a one-line description from the user.
