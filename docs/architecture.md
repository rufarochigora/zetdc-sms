# SMS Architecture

## Data flow

```
[ RTU / gateway, or simulator ]
          │  MQTT publish
          ▼
   sms/{siteId}/telemetry   (every 5-10s)
   sms/{siteId}/event       (on change: breaker trip, relay operation)
   sms/{siteId}/status      (LWT — broker publishes "offline" on ungraceful disconnect)
          │
          ▼
     Mosquitto broker
          │  subscribe: sms/+/telemetry, sms/+/event, sms/+/status
          ▼
  sms-backend/src/mqtt/ingest.js
    1. validate payload shape
    2. write Reading rows / update Breaker,Transformer,BatteryBank state
    3. evaluate alarms/engine.js against the new data
    4. broadcast over Socket.IO to room `site:{siteId}`
    (all four steps happen in one handler — no separate queue for a pilot-scale system)
          │
          ├──► PostgreSQL + TimescaleDB (Reading hypertable, Alarm, Site, Breaker, ...)
          │
          └──► Socket.IO ──► React dashboard (live cards, trend charts, alarm toasts)

  REST API (Express, JWT-protected) sits alongside the socket for anything that isn't a live
  push: login, site list/detail, historical readings queries, alarm list/ack/clear, reports.
```

## Alarm engine

`alarms/rules.js` holds the six rules from the build spec as pure functions (given inputs, do we
fire, and with what severity/message). `alarms/engine.js` is the stateful layer around them: it
pulls the relevant DB rows, detects transitions (charger true→false, transformer
energized→de-energized, breaker count crossing threshold), and — critically — de-duplicates so
only one open (`new`/`acknowledged`) alarm per `(siteId, type)` exists at a time, except for
`relay_operation`, where every discrete event is its own alarm by design (each operation is a
distinct, notable event, not a persisting condition).

`site_offline` is the one rule that isn't triggered by an incoming message — it's a periodic
sweep (`sweepOfflineSites`, run every 15s from `server.js`) that compares each site's
last-message timestamp against `SITE_OFFLINE_TIMEOUT_MS`. The MQTT Last-Will status topic gives a
faster path to the same conclusion when a gateway disconnects ungracefully rather than just going
quiet.

## Scalability note

Adding a new substation is "add a topic, add a DB row" — the backend subscribes to
`sms/+/telemetry` etc. with MQTT wildcards, and `ingest.js` upserts a `Site` row the first time it
sees a message from a new `siteId`. No backend redeploy or config change is needed to onboard a
new gateway; you only need to seed its child records (`BatteryBank`, `Breaker`, `Transformer`,
`Relay`) so the alarm rules have real thresholds to evaluate — see `sms-backend/src/db/seed.js` for
the pattern.

## Auth & roles

JWT issued on login (`POST /api/auth/login`), verified per-request by `authenticate` middleware,
scoped by `authorize(['role', ...])` on individual routes. Three roles:

| Role | Can do |
|---|---|
| `operator` | View sites/alarms, acknowledge/clear alarms |
| `engineer` | + configure thresholds (once that UI exists) |
| `admin` | + user management, full config |

The frontend keeps the JWT in memory only (React context), never `localStorage` — see the README
for the production follow-up on cookie-based auth.
