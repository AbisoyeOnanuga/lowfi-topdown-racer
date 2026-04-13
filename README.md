# Low-fi top-down racer

Browser prototype: vehicle feel, track projection, AI opponents, local best times, procedural audio.

## Run locally

Needs a static server (ES modules):

```bash
npm start
```

Then open the URL shown (port **8787**).

## GitHub Pages

1. Push this repo to GitHub on branch `main`.
2. **Settings → Pages → Build and deployment:** set **Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` publishes the repo root on each push to `main`.

The site works at the root of `https://<user>.github.io/<repo>/` because all asset paths are relative.

## Writing & repo notes

- **`ONLINE-POST.md`** — paste-ready copy for social posts about learnings from building with AI.
- **`AUTO_COMMIT.md`** — how **Cursor auto-commit** is wired for this repo (optional `stop` hook).

## Cursor auto-commit (summary)

This project can **commit after each agent session** via `.cursor/hooks.json` → `stop` → `node .cursor/hooks/auto-commit-stop.mjs`. It is **not** “the model commits when you type ‘commit’” unless you ask for that in chat; it runs when the **agent turn ends**. See **`AUTO_COMMIT.md`** to enable/disable.
