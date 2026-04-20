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
- [Optional: local files sync](#optional-local-files-sync)
- [Troubleshooting](#troubleshooting)

---

## 0. Prereqs

- **Node 20+** and **pnpm** (via [corepack](https://pnpm.io/installation#using-corepack) — easiest path).
- **Python 3.12** and [**`uv`**](https://docs.astral.sh/uv/).
- A **Supabase** account (free tier is fine). [Sign up](https://supabase.com).
- A **Vercel** account *(only if you want the app reachable from the internet — i.e. Claude.ai and the iOS app. Any other Python-capable host works too, `vercel.json` is just the pre-configured path.)*

## 1. Create your Supabase project

1. **supabase.com → New project**. Pick any region near you. Save the database password somewhere.
2. Wait ~1 minute for it to provision.
3. In the project dashboard, go to **Settings → API** and copy:
   - **Project URL** (`https://abcdefg.supabase.co`) → you'll paste this as `SUPABASE_URL`.
   - **`service_role` secret** → you'll paste this as `SUPABASE_SERVICE_KEY`. Treat it like a database password.

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

Open `.env` and fill each value. Two you'll need to generate:

```bash
# Password hash for logging into the dashboard
uv run python -m app.tools.hashpw 'pick-a-strong-password'
# → paste the full $argon2id$... line into APP_PASSWORD_HASH

# Random session-signing secret
python -c 'import secrets; print(secrets.token_urlsafe(48))'
# → paste into SESSION_SECRET
```

Minimum `.env` for local dev:

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

The SQL files under `db/migrations/` are the whole schema (courses, lectures, study topics, deliverables, tasks, OAuth tables, etc.). Apply them **in numeric order**.

**Easiest path — paste each file into the Supabase dashboard's SQL editor:**

1. Open **SQL Editor → New query**
2. Paste `db/migrations/0001_init.sql` → **Run**
3. Paste `db/migrations/0002_lectures.sql` → **Run**
4. Paste `db/migrations/0003_oauth.sql` → **Run**
5. Paste `db/migrations/0004_app_settings.sql` → **Run**

**If you have the Supabase CLI installed** (`npm i -g supabase` or via `npx`):

```bash
npx supabase link --project-ref YOUR-PROJECT-REF   # one-time
for f in db/migrations/*.sql; do
  npx supabase db query --linked --file "$f"
done
```

**Direct `psql`** — only works over IPv4 if your network doesn't route IPv6 to Supabase. Use the **Session Pooler** connection string from **Supabase → Settings → Database → Connection string**:

```bash
export SUPABASE_DB_URL='postgresql://postgres.YOUR-REF:YOUR-DB-PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres'
for f in db/migrations/*.sql; do psql "$SUPABASE_DB_URL" -f "$f"; done
```

## 5. Run it locally

Seed the singleton settings row, then start the two servers:

```bash
uv run python -m db.seed                            # creates the app_settings row

# Terminal 1 — backend
uv run uvicorn app.main:app --reload
# → http://localhost:8000/api/docs  (interactive API docs)

# Terminal 2 — frontend
cd web && pnpm dev
# → http://localhost:5173
```

Open `http://localhost:5173`, log in with the password you hashed. You'll see an empty dashboard with two CTAs: **Set up profile** and **Add your first course**. That's it — the rest of the UI and the MCP tools all create/read the same data from here.

## 6. Deploy to Vercel (or skip)

Skip this section if you only want to use the dashboard on your own machine. The local dev setup above is enough.

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

The FastAPI app mounts a Streamable HTTP MCP endpoint at `/mcp`, OAuth-gated. **One endpoint, same tools for every client** — Claude.ai, Claude Code, the Claude iOS app, the ChatGPT connector, anything else that speaks remote-HTTP MCP.

Set `$URL` once and use it everywhere:

```bash
# Pick the one that matches where the app is running:
export URL=https://<your-project>.vercel.app/mcp   # deployed
# or
export URL=http://localhost:8000/mcp               # local dev
```

### Claude.ai (browser → also picked up by the Claude iOS app)

1. **Settings → Connectors → Add custom connector**
2. Paste `$URL`.
3. Claude redirects you to your dashboard's login — type your password, click **Authorize**.
4. Toggle the connector on in whichever chats / Projects you want.
5. Smoke test: *"list my courses"*.

Once added on claude.ai, the same connector appears in the **Claude iOS app** automatically.

### Claude Code CLI

```bash
claude mcp add --transport http --scope user study-dashboard "$URL"
```

`--scope user` makes the connector available in every directory you run `claude` from. The CLI opens your browser for the OAuth flow on first use; the token's cached in `~/.claude.json`.

Smoke test inside `claude`: *"list my courses"*.

### Verify the endpoint without a client

The OAuth discovery endpoint is public and makes a good sanity check:

```bash
# Drop the trailing /mcp and hit /.well-known/ at the origin root
ORIGIN="${URL%/mcp}"
curl -s "$ORIGIN/.well-known/oauth-authorization-server" | head -40
# → should return JSON with `issuer`, `authorization_endpoint`, `token_endpoint`, etc.
```

If that returns JSON, the server is reachable and OAuth is wired up. A 404 / 500 here means the deployment's wrong before we even get to auth — usually a missing `PUBLIC_URL` env var.

### Pair Claude.ai with a Project prompt

You get a much nicer experience if you paste a tailored system prompt into a Claude.ai **Project** alongside the connector — it tells Claude what your courses are, what "studied" means, when to ask vs. just act, etc. Template + worked example: [`docs/claude-ai-system-prompt.md`](./docs/claude-ai-system-prompt.md).

## Optional: local files sync

`scripts/sync.py` mirrors a local folder to the `course_files` bucket in Supabase, so large PDFs don't live in your repo but still show up in the Files view (and get served to Claude through `read_course_file`).

```bash
export STUDY_ROOT="$HOME/Documents/study"
uv run python scripts/sync.py push    # upload local → bucket
uv run python scripts/sync.py pull    # download bucket → local
uv run python scripts/sync.py watch   # continuous both-ways
```

If you prefer to upload files through the UI, you can ignore this.

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
