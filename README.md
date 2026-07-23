# SMS — Substation Monitoring System

Full-stack monitoring system for unmanned 33/11kV substations. Since there's no physical RTU
hardware yet, the repo includes a **simulator** that emits realistic telemetry over MQTT so the
whole pipeline — ingestion → database → API → WebSocket → React dashboard — can be demoed
end-to-end.

## Stack

Node.js 20 / Express · Prisma · PostgreSQL 16 + TimescaleDB · Mosquitto (MQTT) · Socket.IO ·
JWT auth · Vite + React 18 · Tailwind CSS · Recharts · Twilio (SMS, stub mode) · Nodemailer
(email, stub mode). See `docs/architecture.md` for the full picture.

## Quick start (Docker, recommended)

```bash
cp .env.example .env
# edit .env — at minimum change JWT_SECRET and SEED_ADMIN_PASSWORD

docker compose up --build
```

This brings up Postgres+Timescale, Mosquitto, the backend API, the frontend dev server, and the
simulator (3 fake sites by default). First run needs two one-off setup steps:

```bash
# 1. Apply the TimescaleDB hypertable conversion (one-time, after the first migration runs)
docker compose exec postgres psql -U sms -d sms -f /docker-entrypoint-initdb.d/timescale_setup.sql
# (or copy sms-backend/src/db/migrations/timescale_setup.sql into the container and run it manually)

# 2. Seed the admin user + 3 demo substations (site-1, site-2, site-3 — matches the simulator's
#    default site IDs, so alarms have real thresholds to fire against from the first message)
docker compose exec backend npm run seed
```

Then open:
- Frontend: http://localhost:5173
- Backend health check: http://localhost:4000/health

Log in with the admin credentials from your `.env` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

## Running without Docker

```bash
# Terminal 1 — Postgres + Mosquitto need to be running locally, or point
# DATABASE_URL / MQTT_URL in .env at remote instances.

# Terminal 2 — backend
cd sms-backend
npm install
npm run prisma:migrate     # creates tables
# run sms-backend/src/db/migrations/timescale_setup.sql against your DB once
npm run seed
npm run dev

# Terminal 3 — simulator (fakes 3 substations by default; SIM_SITE_COUNT / SIM_INTERVAL_MS
# and SIM_SITE_IDS in .env control how many sites and how chatty)
cd sms-backend
npm run simulator

# Terminal 4 — frontend
cd zetdc-sms
npm install
npm run dev
```

## Demoing the acceptance checks

- **Live fleet view**: with the simulator running, the Overview page shows 3 sites and their
  status/alarm-severity coloring updates live, no refresh needed.
- **Relay operation → toast + alarm**: the simulator randomly fires relay events every tick
  (~4% chance per site per cycle). To force one immediately instead of waiting, publish directly:
  ```bash
  docker compose exec mosquitto mosquitto_pub -t sms/site-1/event -m \
    '{"timestamp":"2026-07-22T09:15:03Z","type":"relay_operation","relayLabel":"Feeder Relay 1","target":"Overcurrent"}'
  ```
  You should see a toast + sound in the UI and a new `critical` alarm in the feed within ~1s.
- **Alarm acknowledgement persists**: acknowledge an alarm, refresh the page — it's server
  state (Postgres `Alarm.state`), not local React state, so it survives the reload.
- **Site offline detection**: run one simulated site as its own process
  (`SIM_SITE_IDS=site-1 node src/simulator/site-simulator.js`) and kill just that process. Its
  MQTT Last-Will message fires the `sms/site-1/status` offline topic, and/or the backend's
  15s sweep will catch it once `SITE_OFFLINE_TIMEOUT_MS` (default 120s) elapses. The card flips
  to "offline" without a refresh.
- **Role gating**: log in as the seeded `admin` user vs. creating an `operator`-role user via
  Prisma Studio (`npm run prisma:studio`) — the `authorize()` middleware on backend routes
  enforces role checks server-side; the frontend's config UI (threshold editing) is left as a
  follow-up (see below) rather than scaffolded speculatively.

## Notes / deliberate scope decisions

- **JWT storage**: kept in React state (memory only), not `localStorage`, per this build's
  security constraints. That means a page refresh logs you out. For a real production
  deployment, switch to an httpOnly cookie issued by the backend — flagging this explicitly
  as a follow-up decision rather than guessing at cookie/session infra you haven't specified.
- **Notifications run in stub/log mode** until you supply real Twilio and SMTP credentials in
  `.env` — the rest of the system never blocks on that setup.
- **Breaker maintenance thresholds** are seeded at `15` (not the schema default of `2000`) for
  the three demo sites specifically, so the `breaker_maintenance` alarm is reachable during a
  live demo instead of only after years of real operations data. Real sites created later default
  to `2000` as specified.
- **Threshold-configuration UI** (engineer/admin-only) is intentionally not built yet — Section 8
  only specifies read/operate views (Overview, SubstationDetail) plus role gating on the backend;
  scaffolding a config screen without a specified design would be guessing. The `authorize()`
  middleware and `engineer`/`admin` roles are already wired up for whenever that screen is added.

## Repo layout

```
sms/
├── docker-compose.yml
├── .env.example
├── mosquitto/config/mosquitto.conf
├── sms-backend/            # Express API, MQTT ingestion, alarm engine, simulator
└── zetdc-sms/          # Vite + React dashboard
```
