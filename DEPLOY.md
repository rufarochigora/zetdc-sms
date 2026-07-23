# SMS Deployment Guide — GitHub → Render → Vercel (no Docker Desktop needed)

Covers: pushing the repo to GitHub, deploying `sms-backend` + Mosquitto + Postgres on Render,
running the `zetdc-sms` frontend locally against the live Render backend, and deploying it to
Vercel.

Docker Desktop is **not required for any of this** — Render builds your Docker images in the
cloud from the `Dockerfile`s already in the repo, and the frontend runs with a plain
`npm run dev`. This is the fully-online path; use it instead of `docker-compose up`.

Repo layout this guide assumes:

```
sms/
├── sms-backend/       # Express API, MQTT ingestion, alarm engine, simulator
├── zetdc-sms/         # React frontend
├── mosquitto/         # MQTT broker config + Dockerfile
├── docker-compose.yml # only used if you later get Docker Desktop working locally — not needed below
└── .env.example
```

---

## 1. Push the repo to GitHub

From the repo root (the folder containing `sms-backend/`, `zetdc-sms/`, `mosquitto/`,
`docker-compose.yml`):

```bash
git init                      # skip if already a git repo
git add .
git commit -m "Initial commit — SMS backend + zetdc-sms frontend"
```

Create an empty repo on GitHub (github.com → **New repository** → don't initialize with a
README, you already have one), then:

```bash
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git branch -M main
git push -u origin main
```

Confirm it: refresh the GitHub repo page and check `sms-backend/`, `zetdc-sms/`, and
`docker-compose.yml` are all there.

> Double-check a `.gitignore` exists (or add one) that excludes `node_modules/` and `.env` in
> both `sms-backend/` and `zetdc-sms/` before your first commit — you don't want real secrets or
> installed packages in the repo.

```
# .gitignore at repo root
node_modules/
.env
dist/
```

---

## 2. Deploy the backend on Render

You'll create 4 Render services, in this order (each depends on the one before it existing):
**Postgres → Mosquitto → Backend → Simulator**. All of this happens in the Render dashboard —
Render clones your GitHub repo and builds each service's `Dockerfile` itself, so nothing needs
to build or run on your machine.

### 2.1 Postgres

Render dashboard → **New → PostgreSQL**.
- Name it `sms-postgres`, pick a region, pick a paid plan if you want the DB to persist (free
  Postgres instances on Render expire).
- Once it's provisioned, open **Info** and copy the **Internal Database URL** — you'll use this
  as `DATABASE_URL` in step 2.3.
- Use the **PSQL Command** shown on that page to open a shell, then run:
  ```sql
  CREATE EXTENSION IF NOT EXISTS timescaledb;
  ```
- Leave this tab open — you'll come back after the backend's first deploy to run
  `create_hypertable(...)` once the `Reading` table exists (step 2.3).

### 2.2 Mosquitto (MQTT broker)

Render dashboard → **New → Private Service**.
- Connect your GitHub repo, set **Root Directory** to `mosquitto`.
- Render auto-detects the `Dockerfile` in that folder — it bakes in
  `mosquitto/config/mosquitto.conf`.
- No environment variables needed. Private services get no public URL, which is correct here.
- Deploy, then open **Connect** and note the internal address (e.g. `sms-mosquitto:1883`). You'll
  need this for both the backend and the simulator.

### 2.3 Backend (Web Service)

Render dashboard → **New → Web Service**.
- Connect the repo, **Root Directory**: `sms-backend`. Runtime: Docker (auto-detected from
  `sms-backend/Dockerfile`).
- **Name the service `sms-backend`** — this is what determines the public URL Render gives you
  (`https://sms-backend.onrender.com`), which every other step and env var below assumes.
- **Pre-Deploy Command**:
  ```
  npx prisma migrate deploy --schema src/db/schema.prisma
  ```
- Leave the start command blank (uses the Dockerfile's `CMD node src/server.js`).
- **Environment variables**:
  ```
  DATABASE_URL=<Internal Database URL from step 2.1>
  MQTT_URL=mqtt://<mosquitto internal address from step 2.2>
  JWT_SECRET=<long random string>
  JWT_EXPIRES_IN=12h
  SITE_OFFLINE_TIMEOUT_MS=120000
  SEED_ADMIN_EMAIL=<your real admin email>
  SEED_ADMIN_PASSWORD=<a real password>
  CORS_ORIGIN=*
  ```
  (Set `CORS_ORIGIN` to your real Vercel URL once you have it in step 4 — `*` is fine to get
  things running first.) Don't set `PORT` — Render assigns it automatically.
- Deploy. Watch the logs for the pre-deploy migration succeeding, then
  `SMS backend listening on :<port>`.
- Copy this service's public URL (top of its Render dashboard page — should read
  `https://sms-backend.onrender.com` if you named it `sms-backend` above) — you'll need it for
  the frontend in step 3 and 4.
- Back in the Postgres PSQL shell from step 2.1, run:
  ```sql
  SELECT create_hypertable('"Reading"', 'timestamp', if_not_exists => TRUE, migrate_data => TRUE);
  ```
- Open the backend service's **Shell** tab and run:
  ```
  npm run seed
  ```
  This creates your admin login and three demo substations (`site-1`, `site-2`, `site-3`).

### 2.4 Simulator (Background Worker)

Render dashboard → **New → Background Worker**.
- Connect the repo, **Root Directory**: `sms-backend` (same image as the backend service).
- **Start Command**: override to `node src/simulator/site-simulator.js`.
- **Environment variables**:
  ```
  MQTT_URL=mqtt://<same mosquitto internal address as 2.2>
  SIM_SITE_COUNT=3
  SIM_INTERVAL_MS=7000
  ```
- Deploy. Check its logs for `[sim] starting 3 simulated site(s)`.

At this point your backend is fully live and publishing fake telemetry —
`https://sms-backend.onrender.com/health` should return `{"status":"ok"}`.

---

## 3. Run the `zetdc-sms` frontend locally

No Docker needed here either — this is a plain Vite dev server talking to your live Render
backend over the internet.

```bash
cd zetdc-sms
npm install
```

Create `zetdc-sms/.env`:

```
VITE_API_URL=https://sms-backend.onrender.com
VITE_WS_URL=https://sms-backend.onrender.com
```

(Use your actual Render backend URL from step 2.3 — it'll match this exactly if you named the
service `sms-backend`.)

```bash
npm run dev
```

Open http://localhost:5173, log in with the admin credentials from step 2.3. You should see
`site-1`, `site-2`, `site-3` populate live within a few seconds — this confirms the whole
deployed backend chain works before you push the frontend anywhere.

> If login fails or the socket won't connect, go back to step 2.3 and set `CORS_ORIGIN` on the
> Render backend to `http://localhost:5173` (comma-separate multiple origins if you also want
> the Vercel one working at the same time — check `sms-backend/src/config/env.js` /
> `server.js`'s `cors()` call handles a single origin string; for multiple origins you'd extend
> that to an array).

---

## 4. Deploy `zetdc-sms` to Vercel

1. Vercel dashboard → **Add New → Project**, import the same GitHub repo.
2. **Root Directory**: `zetdc-sms`.
3. Framework preset: Vercel auto-detects **Vite**. Build command `npm run build`, output `dist`
   (both defaults — leave them).
4. **Environment Variables**:
   ```
   VITE_API_URL=https://sms-backend.onrender.com
   VITE_WS_URL=https://sms-backend.onrender.com
   ```
   Same Render backend URL as step 3. These get baked in at build time, so redeploy after
   changing them.
5. Click **Deploy**.
6. Once it's live, copy the Vercel URL (e.g. `https://zetdc-sms.vercel.app`).

### Close the loop on CORS

Back on the **backend** Render service (`sms-backend`) → Environment tab → set:
```
CORS_ORIGIN=https://zetdc-sms.vercel.app
```
Then trigger a manual redeploy on Render. Without this, the browser blocks API calls and the
socket won't connect from the deployed frontend — check the browser console for CORS errors if
the Vercel site loads but shows no data.

### Verify

- Open the Vercel URL, log in.
- Overview page should populate with the 3 demo sites within a few seconds.
- If not: check Render logs for `sms-backend` and the simulator worker, and your browser console
  for CORS/WebSocket errors.

### Custom domain (optional)

Vercel: **Settings → Domains**. If you add one, update `CORS_ORIGIN` on Render to match and
redeploy.

---

## Quick reference

| Step | Where | What you're getting |
|---|---|---|
| 1 | GitHub | Source of truth both Render and Vercel deploy from |
| 2.1 | Render | Postgres + TimescaleDB (`sms-postgres`) |
| 2.2 | Render | Mosquitto (internal only, `sms-mosquitto`) |
| 2.3 | Render | Backend API + WebSocket + MQTT ingestion — public URL (`sms-backend`) |
| 2.4 | Render | Simulator — fakes telemetry until real RTUs exist |
| 3 | Your machine | `zetdc-sms` running locally (`npm run dev`, no Docker) against the live backend |
| 4 | Vercel | `zetdc-sms` deployed and public |
