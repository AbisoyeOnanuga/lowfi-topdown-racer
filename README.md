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

## Writing

- **`ONLINE-POST.md`** — paste-ready copy for social posts about learnings from building with AI.

Optional: a Cursor **`stop`** hook in `.cursor/hooks.json` runs `node .cursor/hooks/auto-commit-stop.mjs` after an agent session (remove that hook to disable).
