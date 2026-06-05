# Meridian — Team Consultation Engine

Self-hosted build. base44 has been removed; the app now runs on its own
**Node/Express + SQLite** backend and a Vite/React frontend. Everything runs on a
single server (e.g. a Contabo VPS).

## What replaced base44

| base44 feature | Replacement |
| --- | --- |
| Hosted auth (`auth.me`, login redirect) | Email/password login with JWT (`server/auth.js`) + `/login` page |
| Entities (database CRUD) | SQLite via `better-sqlite3` (`server/db.js`) |
| Serverless functions (personaConsult, onboardingChat, sidebarChat, setClientRole) | Express routes calling the Anthropic API (`server/ai.js`) |
| Integrations (file upload + extract) | `multer` upload + `pdf-parse`/`mammoth` text extraction (`server/index.js`) |
| User invites | Admin-only `/api/users/invite` |

The frontend still imports `base44` from `src/api/base44Client.js` — that file is now
a thin client for our own backend, so the React components were left almost untouched.

## Project layout

```
.              Vite/React frontend
server/        Express + SQLite backend (its own package.json)
```

## Prerequisites

- Node.js 18+ (20 LTS recommended)
- An Anthropic API key

## Configuration

Create `server/.env` from the template:

```bash
cp server/.env.example server/.env
```

Then set at least:

```
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=<a long random string>
```

`ANTHROPIC_MODEL` defaults to `claude-opus-4-5` (what this app used on base44).
Change it if your key targets a different model.

## Run locally (two terminals)

```bash
# 1. backend
cd server
npm install
npm start            # http://localhost:8787

# 2. frontend (from the project root)
npm install
npm run dev          # http://localhost:5173  (proxies /api to the backend)
```

Open http://localhost:5173, click **Create account** — the **first account you
register becomes the admin**. After that, the admin can invite clients from the
in-app Settings panel.

## Deploy on a Contabo VPS (single process)

In production the Express server also serves the built frontend, so you only run
one Node process.

```bash
# on the VPS, in the project directory:

# 1. build the frontend (creates ./dist)
npm install
npm run build

# 2. install + start the backend (serves ./dist and the API)
cd server
npm install
cp .env.example .env      # then edit .env with your real values
npm start                 # listens on PORT (default 8787)
```

Now `http://<your-vps-ip>:8787` serves the whole app.

### Keep it running with PM2

```bash
npm install -g pm2
cd server
pm2 start index.js --name meridian
pm2 save && pm2 startup
```

### Put it behind Nginx + HTTPS (recommended)

```nginx
server {
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then run `certbot --nginx -d your-domain.com` for a free TLS certificate.

After the first deploy, rebuild the frontend (`npm run build`) whenever you change
frontend code, and restart the backend (`pm2 restart meridian`) whenever you change
`server/` code.

## Data & files

- Database file: `server/data/meridian.db` (override with `DB_PATH`)
- Uploaded documents: `server/uploads/` (override with `UPLOAD_DIR`)

Back these two up to preserve all profiles, consultations, and uploads.
