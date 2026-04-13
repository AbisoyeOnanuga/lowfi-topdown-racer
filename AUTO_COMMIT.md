# Auto-commit (this project)

## How it works

**Cursor does not commit by itself** when you save files or when the model answers in chat. A commit happens when:

1. **You ask the agent** (or use Source Control) to run `git commit`, or  
2. This repo’s **Cursor hook** runs on the **`stop` event** — after an **agent session** ends (the model’s turn finishes).

The hook is defined in `.cursor/hooks.json` and runs `node .cursor/hooks/auto-commit-stop.mjs`. That script runs `git add -A` and creates a commit **only if** there are staged changes. If there is nothing to commit, it exits quietly.

So: **not “whenever I say so” in chat text**, unless you literally ask for a commit — but **yes, automatically at the end of an agent run**, if you leave this hook enabled.

## Disable or change behavior

- Remove the `stop` entry from `.cursor/hooks.json`, or rename/delete `.cursor/hooks.json`.  
- Or delete `.cursor/hooks/auto-commit-stop.mjs` and clear the `stop` hook.  
- Restart Cursor after editing hooks if they do not apply.

## Requirements

- `git` on your `PATH`  
- Node.js (for `node .cursor/hooks/...`)  
- You are inside a git repository (this project already is)

## Note

If you use **user-level** hooks in `~/.cursor/hooks.json`, Cursor merges behavior with project hooks — avoid duplicate `stop` hooks unless you intend to run both.
