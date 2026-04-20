# Install study-dashboard

Step-by-step, from empty machine to a running dashboard with an MCP connector live in Claude.

End-to-end: **~15 minutes** on a good connection.

- [0. Prereqs](#0-prereqs)
- [1. Create your Supabase project](#1-create-your-supabase-project)
- [2. Clone + install deps](#2-clone--install-deps)
- [3. Fill in `.env`](#3-fill-in-env)
- [4. Apply the migrations](#4-apply-the-migrations)
- [5. Run it locally](#5-run-it-locally)
- [6. Deploy to Vercel (or skip)](#6-deploy-to-vercel-or-skip)
- [7. Connect an MCP client](#7-connect-an-mcp-client)
- [Troubleshooting](#troubleshooting)

---

## 0. Prereqs

You'll need Node 20+, pnpm, Python 3.12, and [`uv`](https://docs.astral.sh/uv/). One-liners per OS:

**Windows** (PowerShell or terminal):

```powershell
winget install OpenJS.NodeJS.LTS
winget install --id=astral-sh.uv
uv python install 3.12
corepack enable
corepack prepare pnpm@latest --activate
```

**macOS** (with [Homebrew](https://brew.sh)):

```bash
brew install node uv
uv python install 3.12
corepack enable
corepack prepare pnpm@latest --activate
```

**Linux**:

```bash
# Node via nvm (https://github.com/nvm-sh/nvm#install--update-script)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20

# uv — it'll install Python 3.12 for us
curl -LsSf https://astral.sh/uv/install.sh | sh
uv python install 3.12

corepack enable
corepack prepare pnpm@latest --activate
```

Already have some of them? Skip the lines you don't need.

You'll also need:

- A **Supabase** account (free tier is fine). [Sign up](https://supabase.com).
- A **Vercel** account *(only if you want the app reachable from the internet — i.e. Claude.ai and the iOS app. Any other Python-capable host works too, `vercel.json` is just the pre-configured path.)*

> On Windows, `python` may not be on your PATH even though Python is installed — the launcher is called `py` instead. Anywhere you see `python -c '...'` below, `py -c '...'` works equivalently.

## 1. Create your Supabase project

1. **supabase.com → New project**. Pick any region near you. **Set a database password and save it somewhere secure** — you can't retrieve it later, only reset it.
2. Wait ~1 minute for it to provision. You'll land on the project overview.
3. Grab your **Project URL**: in the project overview page, click the **Copy** button (right under your project name) → select **Project URL**. This will be your `SUPABASE_URL`. You will need this when filling in the `.env` file.
4. Grab your **service_role key**: sidebar → **Project Settings → API Keys** → switch to the **"Legacy anon, service_role API keys"** tab → copy the **`service_role` secret**. This will be your `SUPABASE_SERVICE_KEY`. Treat it like a database password — anyone who has it can read and write your entire database. Keep it safe! You will need this when filling in the `.env` file.

## 2. Clone + install deps

```bash
git clone https://github.com/AmmarSaleh50/study-dashboard
cd study-dashboard

uv sync                              # Python deps
cd web && pnpm install && cd ..      # frontend deps
```

## 3. Fill in `.env`

```bash
cp .env.example .env
```

Before filling in the `.env` file, you'll need to generate two values:

```bash
# Password hash for logging into the dashboard
uv run python -m app.tools.hashpw 'pick-a-strong-password'
# → paste the full $argon2id$... line into APP_PASSWORD_HASH

# Random session-signing secret
python -c 'import secrets; print(secrets.token_urlsafe(48))'   # or `py` on Windows
# → paste into SESSION_SECRET
```

Minimum `.env` for local dev should look like this:

```ini
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_KEY=eyJ...your-service-role-key...
APP_PASSWORD_HASH=$argon2id$v=19$m=65536,t=3,p=4$...
SESSION_SECRET=<48-char-random-string>
CORS_ORIGINS=http://localhost:5173
```

Also create `web/.env.local`:

```ini
VITE_API_BASE_URL=http://localhost:8000
```

## 4. Apply the migrations

The SQL files under `supabase/migrations/` are the whole schema (courses, lectures, study topics, deliverables, tasks, OAuth tables, etc.). They get applied by the **Supabase CLI**, which tracks applied migrations in `supabase_migrations.schema_migrations` — so every subsequent push only runs what's new.

**Primary path — `supabase db push`** (recommended, keeps the migration table clean):

```bash
# Authenticate once, per machine:
npx supabase login                                # opens browser

# Link this checkout to your project (grab the project-ref from
# supabase.com → Project Settings → General):
npx supabase link --project-ref YOUR-PROJECT-REF

# Apply every pending migration:
npx supabase db push
```

On a fresh project this runs all five migrations in order and records them. On subsequent updates (e.g. after a `git pull` brings in a new migration file), re-running `npx supabase db push` applies only the new ones.

> 💡 If you'd rather install the CLI globally instead of using `npx`:
> `npm i -g supabase` and then drop the `npx` prefix.

### Upgrading an existing DB (you previously ran migrations via the SQL editor)

If you applied migrations manually before, Supabase doesn't yet know they're applied — a naive `db push` would try to re-run them and the `ALTER TABLE RENAME` in migration 5 would fail. Tell the CLI which ones are already in place:

```bash
npx supabase migration list                       # shows local vs. remote status
# For every migration already applied to your DB, mark it applied:
npx supabase migration repair --status applied 20260101000001
npx supabase migration repair --status applied 20260115000001
npx supabase migration repair --status applied 20260201000001
npx supabase migration repair --status applied 20260301000001
# Then push — only the truly-new ones run:
npx supabase db push
```

(If you don't remember which ones are already applied: `supabase migration list` shows a ✓ on the remote side for each one that the CLI *does* know about. Unmarked rows where the tables/columns already exist in your DB are the ones needing `repair --status applied`.)

### Fallback: dashboard SQL editor (no CLI)

If you'd rather not involve the CLI at all — or your Postgres isn't on Supabase — open the Supabase dashboard's **SQL Editor → New query**, then paste and run each file from `supabase/migrations/` in filename order:

1. `20260101000001_init.sql`
2. `20260115000001_lectures.sql`
3. `20260201000001_oauth.sql`
4. `20260301000001_app_settings.sql`
5. `20260420000001_english_canonical_kinds.sql`

Same result on the database; the `schema_migrations` table just won't track them.

## 5. Run it locally

Start the two servers in separate terminals:

```bash
# Terminal 1 — backend
uv run uvicorn app.main:app --reload
# → http://localhost:8000/api/docs  (interactive API docs)

# Terminal 2 — frontend
cd web && pnpm dev
# → http://localhost:5173
```

Open `http://localhost:5173`, log in with the password you hashed. You'll see an empty dashboard with two CTAs: **Set up profile** and **Add your first course**. That's it — the rest of the UI and the MCP tools all create/read the same data from here.

## 6. Deploy to Vercel (or any hosting provider you prefer)

Skip this section if you only want to use the dashboard on your own machine. Note: you won't have the ability to let your Claude do actions in your apps through the MCP, if you don't deploy the app to a public URL.  

The repo is pre-configured (`vercel.json`) to deploy both the static frontend and the Python API functions from one project.

1. Push your fork to GitHub.
2. **vercel.com → Add New Project → import your fork**.
3. Framework preset: **Other**. Leave the build command / output dir as-is.
4. **Environment Variables** — add every backend var from your `.env`:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `APP_PASSWORD_HASH`, `SESSION_SECRET`
   - `PUBLIC_URL` — **set this to `https://<your-project>.vercel.app`** (no trailing slash). The MCP OAuth flow uses this to build callback URLs.
   - `CORS_ORIGINS` — same public URL.
5. Deploy. First deploy takes 1–2 minutes.
6. Visit your deployment URL, log in, set your profile + courses.

After the initial deploy, `git push origin main` auto-redeploys.

## 7. Connect an MCP client

The FastAPI app mounts a Streamable HTTP MCP endpoint at `/mcp`, OAuth-gated. **One endpoint, same tools for every client** — Claude.ai, Claude Code, the Claude phone app, anything else that speaks remote-HTTP MCP.

Your endpoint URL is:

```
https://<your-project>.vercel.app/mcp
```

Replace `<your-project>` with your own Vercel project name. (If you skipped deployment and only want to wire it into Claude Code locally, use `http://localhost:8000/mcp` instead — but Claude.ai and the Claude phone app can't reach `localhost`.)

### Claude.ai (browser → also picked up by the Claude phone app)

1. Go to **Settings → Connectors → Add custom connector** in claude.ai.
2. Paste your endpoint URL (e.g. `https://your-project.vercel.app/mcp`).
3. Claude redirects you to your dashboard's login — type your password, click **Authorize**.
4. Toggle the connector on in whichever chats / Projects you want.
5. Smoke test: ask Claude *"list my courses"*.

Once added on claude.ai, the same connector appears in the **Claude phone app** automatically.

### Claude Code CLI

```bash
claude mcp add --transport http --scope user \
  study-dashboard https://<your-project>.vercel.app/mcp
```

`--scope user` makes the connector available in every directory you run `claude` from. The CLI opens your browser for the OAuth flow on first use; the token's cached in `~/.claude.json`.

Smoke test inside `claude`: *"list my courses"*.

### Verify the endpoint without a client

The OAuth discovery endpoint is public — hitting it is a quick way to confirm the server is reachable and OAuth is wired up before you involve Claude at all:

```bash
curl -s https://<your-project>.vercel.app/.well-known/oauth-authorization-server | head -40
# → should return JSON with `issuer`, `authorization_endpoint`, `token_endpoint`, etc.
```

A 404 / 500 here means the deployment's wrong before we even get to auth — usually a missing `PUBLIC_URL` env var on Vercel.

### Pair Claude.ai with a Project prompt

You get a much nicer experience if you paste a tailored system prompt into a Claude.ai **Project** alongside the connector — it tells Claude what your courses are, what "studied" means, when to ask vs. just act, etc. Template + worked example: [`docs/claude-ai-system-prompt.md`](./docs/claude-ai-system-prompt.md).

## Troubleshooting

**`401 invalid password` on login**
Re-hash with `uv run python -m app.tools.hashpw 'your password'` and update `APP_PASSWORD_HASH`. If the password contains shell metacharacters, quote it as shown.

**Backend crashes with "no SUPABASE_URL" / "SUPABASE_SERVICE_KEY is empty"**
The backend reads `.env` from the **working directory you run uvicorn from**, which should be the repo root. Check that `.env` exists there and has no stray quotes around values.

**Weekly grid shows the wrong times**
Your timezone isn't set. Go to **Settings → Semester** and set it to an IANA ID (`Europe/Berlin`, `America/New_York`, `Asia/Dubai`, etc.). The fall-behind logic, "today" marker, and relative times all key off this.

**MCP connector redirect fails ("invalid redirect_uri")**
`PUBLIC_URL` is missing or doesn't match the domain Claude is redirecting back to. In Vercel, it must be `https://<your-project>.vercel.app` (no trailing slash, no extra path). Redeploy after changing env vars.

**Claude.ai says the connector timed out**
Vercel Python functions cold-start slowly on the hobby tier (~2–5 s). The first MCP call after idle sometimes hits the timeout. Retry the same message.

**The deployed app shows stale UI or stale data**
Vercel auto-deploys on push to `main`. If the deploy is green on Vercel but the browser's stale, do a hard refresh (`Ctrl+Shift+R`) — the bundle is aggressively cached. Data: React Query refetches on window focus; or **Settings → Refresh data**.

**I broke something and want a clean slate**
In Supabase SQL Editor: `truncate table tasks, deliverables, study_topics, lectures, schedule_slots, klausuren, events, courses cascade;` keeps the schema + your `app_settings` row but empties all user data. Re-create courses from the UI.
