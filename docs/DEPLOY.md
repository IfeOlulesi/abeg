# Deploying Abeg

Abeg is a **container + a Postgres database**. It uses WebSockets (voice) and
Server-Sent Events (live updates), so deploy it on a host that keeps a normal
long-running server — **not** a serverless/edge platform.

> ⚠️ **Vercel / Netlify are not a good fit** (serverless functions don't hold
> WebSockets or long SSE streams, and there's no bundled Postgres). Use a
> container host below.

The app **self-migrates**: on first boot it creates its schema and seeds the menu
automatically. There is no separate migration step.

## What you need

1. **A Postgres database** (managed is easiest).
2. **Environment variables** (see [`.env.example`](../.env.example)):
   - `DATABASE_URL` — your Postgres connection string.
   - `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` — the chat/tool-calling model.
   - `DEEPGRAM_API_KEY` — voice input (optional).
   - `APP_URL` — your public URL (sent to OpenRouter as the app referer).
   - **Rate limits** (optional, on by default): `RATE_LIMIT_ENABLED`,
     `CHAT_IP_LIMIT`, `CHAT_DAILY_LIMIT`, `STT_IP_LIMIT`, `STT_DAILY_LIMIT`.
3. The provided **[`Dockerfile`](../Dockerfile)** (multi-stage: builds the React app, runs FastAPI).

---

## Option A — Railway (easiest)

1. Create a project → **Add a PostgreSQL** plugin. Railway sets `DATABASE_URL`.
2. **Deploy from GitHub repo** (or `railway up`). Railway detects the `Dockerfile`.
3. In the service **Variables**, add `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`,
   `DEEPGRAM_API_KEY`. (Railway provides `PORT` and `DATABASE_URL` automatically.)
4. Deploy. Open the generated URL.

## Option B — Render

1. **New → Web Service** from your repo; Render detects the `Dockerfile`.
2. **New → PostgreSQL**; copy its Internal Connection String into the web
   service env as `DATABASE_URL`.
3. Add `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `DEEPGRAM_API_KEY`.
4. Deploy. (Render sets `PORT` automatically; the Dockerfile honors it.)

## Option C — Fly.io

```bash
fly launch --no-deploy          # detects the Dockerfile, writes fly.toml
fly postgres create             # then: fly postgres attach <db-app>  (sets DATABASE_URL)
fly secrets set OPENROUTER_API_KEY=... OPENROUTER_MODEL=deepseek/deepseek-chat DEEPGRAM_API_KEY=...
fly deploy
```

## Option D — Any VPS / your own Docker host

```bash
cp .env.example .env     # fill in keys; keep DATABASE_URL pointing at db
docker compose up -d --build
```

`docker compose` runs Postgres **and** the app together. Put it behind a reverse
proxy (Caddy/nginx) with TLS and make sure WebSockets are proxied (`/ws/stt`).

---

## 🔒 Cost & safety — read before hosting publicly

This is a **teaching demo with no authentication**. If you put it on the public
internet:

- **Anyone can use it, spending _your_ API credits.** Set a hard **spending cap**
  on your OpenRouter key and your Deepgram usage. Note: OpenRouter's rate limits
  scale with your credit balance — a near-empty key gets throttled (403s), so
  keep a little credit on it.
- **Rate limiting is built in** (per-IP window + global daily cap on chat & voice)
  and on by default — tune it with the `*_LIMIT` env vars above.
- **BYOK:** visitors can paste their own OpenRouter key in the Workshop; their
  calls are billed to them and bypass the demo limit — the cheapest way to keep a
  public demo alive.
- **Naive mode intentionally corrupts data** (overselling stock) to teach why
  locking matters. Use `X` to reset; keep **grounding on** by default.
- Prefer a **short-lived** deployment for a talk, or leave it in **cached mode**
  (press `C`) so it runs without hitting the AI at all.

---

## Publishing to GitHub (clean history)

This working copy lives inside an agent workspace whose initial commit tracked a
lot of tooling (`.claude/…`). Publish a **clean copy** so the repo contains only
the app. The `.gitignore` already excludes secrets, `node_modules`, build output,
and the workspace tooling.

```bash
# From the project root — export a clean tree (no history, no ignored files):
rsync -a --exclude='.git' --exclude='.env' --exclude='.claude' \
      --exclude='.context' --exclude='node_modules' --exclude='dist' \
      --exclude='.venv' --exclude='__pycache__' ./ ../abeg-oss/

cd ../abeg-oss
git init -b main
git add .
git status          # SANITY CHECK: confirm there is NO .env and NO .claude/
git commit -m "Abeg — AI order agent that takes orders by chat or voice"
gh repo create abeg-app --public --source=. --remote=origin --push
```

Then set the repo description, topics (`ai`, `agent`, `fastapi`, `react`,
`typescript`, `postgresql`, `voice`, `openrouter`, `deepgram`), and a social
preview image (`docs/images/storefront.png`).
