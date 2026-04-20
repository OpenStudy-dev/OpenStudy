# CLAUDE.md

Notes for Claude Code working in this repo. See `README.md` for stack basics and `INSTALL.md` for self-host setup.

## Deployment

**Hosting:** Vercel (frontend + Python API functions). Project is linked in `.vercel/project.json`.

**How deploys happen:** Vercel auto-deploys on every push to `main` via the GitHub integration. Nothing deploys from your local working copy — code changes stay local until pushed.

**Implication:** Edits to files under `app/` (Python backend / MCP tools) and `web/src/` (frontend) only affect the live site at `<your-deployment>.vercel.app` after a `git push` to `main`. The MCP server the user connects to from Claude.ai runs on the deployed Vercel instance — so MCP tool behavior won't change for them until a push.

**When to push:** don't deploy after every fix. Push when:
- The user asks you to deploy / push / "ship it"
- A batch of changes is ready and tested locally
- A bug fix is urgent enough that the live site needs it now

When in doubt, ask. Don't `git push` on your own for routine fixes.

**Deploy commands:**
```bash
git push origin main           # triggers auto-deploy
vercel --prod                  # manual deploy (rarely needed)
vercel logs <url>              # inspect a deployment
```

**Local verification before pushing:**
```bash
cd web && pnpm build           # frontend builds clean
uv run pytest                  # if/when backend tests exist
```

## Two copies of the fall-behind logic

`app/services/fall_behind.py` (Python, runs on Vercel / MCP) and `web/src/lib/fall-behind.ts` (TS, runs in the browser) are intentional mirrors. Keep them in sync when changing rules — constants, grace periods, severity thresholds.
