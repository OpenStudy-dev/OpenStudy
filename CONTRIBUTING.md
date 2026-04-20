# Contributing

Thanks for considering a contribution — genuinely. Whether it's a one-line typo fix, a new MCP tool, or just an issue saying "this didn't work on my machine, here's what I saw" — all of it helps.

This file just has a couple of notes so you know what to expect and we can keep the back-and-forth short.

## What's in scope

Basically anything that makes the app better for someone self-hosting it. A non-exhaustive list of things I'd love help with:

- **Bug fixes** — obvious one. If you hit a bug, please file an issue even if you can't fix it yourself.
- **Self-host polish** — clearer docs, better error messages when an env var is missing, a `docker-compose.yml`, one-click deploy buttons for hosts other than Vercel (Fly, Railway, self-hosted Postgres, etc.).
- **Accessibility + keyboard shortcuts** — the UI is dark, dense, and keyboard-navigable-ish, but could be better.
- **i18n / localization** — the Slot `kind` labels are German (`Vorlesung`, `Übung`) by default. Making those user-configurable or translatable would help non-EU users a lot.
- **New MCP tools** — if you find yourself wishing Claude could do `X` and there's a natural way to expose it, just add it. Pattern is in `app/mcp_tools.py`.
- **Performance / bundle size** — the frontend chunk is bigger than it needs to be; someone who knows their way around Vite code-splitting could shave a lot.
- **Tests** — there's no suite yet. Adding pytest + Vitest scaffolding is its own welcome PR.

## Things worth a quick issue first

Not "no" — just "let's talk first so you don't waste a weekend":

- Major framework swaps (React → Svelte, FastAPI → Django).
- Removing Supabase (doable, but touches auth + storage + Postgres all at once).
- New top-level entities beyond the current data model (Course / Schedule slot / Lecture / Study topic / Deliverable / Task / Klausur).
- Multi-user / team / sharing features — the single-user-per-deploy assumption is load-bearing in a bunch of places, and shifting it is a big project.

A one-liner issue like *"would you take a PR that X?"* is all it takes.

## Dev setup

See [INSTALL.md](./INSTALL.md) for the full walkthrough. TL;DR:

```bash
uv sync
cp .env.example .env   # fill in Supabase creds, APP_PASSWORD_HASH, SESSION_SECRET
uv run python -m db.seed
uv run uvicorn app.main:app --reload

cd web && pnpm install && pnpm dev
```

## Code conventions

- **Python:** `ruff` is configured in `pyproject.toml` (line-length 100, py312 target). Run `uv run ruff check .` and `uv run ruff format .` before pushing.
- **TypeScript/React:** `eslint` is configured in `web/`. Run `pnpm lint` from `web/`. Components are function components + hooks; state via React Query for server state and `useState`/`useReducer` for local.
- **Commit messages:** short imperative subject line (≤70 chars), optional body explaining the *why*. See `git log` for the house style.
- **Scope per PR:** one logical change. A bug fix + a refactor + a new feature should be three PRs.

## The fall-behind mirror

`app/services/fall_behind.py` (Python, runs on the server / in MCP) and `web/src/lib/fall-behind.ts` (TypeScript, runs in the browser) are **intentional mirrors**. Any change to the rules — severity thresholds, grace periods, which topics count — must be applied to both. PRs that only touch one side will get a request for the other.

## Testing

There's no automated test suite yet (honest). Until there is:

- For backend changes: exercise the changed endpoint(s) manually via `curl` or the `/api/docs` Swagger UI, and check that the data round-trips through Supabase.
- For frontend changes: run `pnpm build` to make sure TypeScript is still happy, then manually click through the affected views in `pnpm dev`.
- For MCP tool changes: start the backend (`uv run uvicorn app.main:app --reload`), then either hit the tool via a `POST /mcp` JSON-RPC request with your bearer token (see `curl` snippet in `INSTALL.md`), or register the local endpoint with Claude Code (`claude mcp add --transport http study-dashboard-dev http://localhost:8000/mcp`) and call the tool in chat.

If you're up for adding test infrastructure (pytest + a Supabase mock, Vitest for the frontend), that itself is a welcome PR.

## Submitting a PR

1. Fork, branch, commit.
2. Run the relevant linter/build (`ruff`, `pnpm lint`, `pnpm build`).
3. Push and open a PR against `main`.
4. In the PR description, include: what the change does, how you tested it, anything reviewers should pay attention to.
5. Be patient — this is a side project. Responses may take a few days.

## License

By submitting a PR you agree that your contribution is licensed under the same MIT license as the rest of the project (see [LICENSE](./LICENSE)).
