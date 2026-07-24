# Wiring the backend to an external MQTT broker (HiveMQ Cloud)

Replaces DEPLOY.md step 2.2 (self-hosted Mosquitto on Render, which has no free tier). Use this
instead — HiveMQ Cloud's Serverless plan is permanently free (100 connections, 10 GB traffic, no
credit card), and nothing else in DEPLOY.md changes: Postgres (step 2.1), backend (step 2.3),
simulator (step 2.4), and the frontend steps (3–4) all stay exactly as written.

---

## 1. Create the HiveMQ Cloud cluster

1. Go to **hivemq.com/mqtt-cloud-broker** → sign up (no card needed).
2. On the cluster options, choose **HiveMQ Cloud Serverless** — the free plan. Don't pick
   "Starter," which is a paid-trial tier.
3. Name the cluster (lowercase letters/numbers only) and create it. It's ready within a minute.

## 2. Get your connection details

Open the cluster → **Overview** (or **Connection**) tab and note:

- **Host** — looks like `xxxxxxxxxxxx.s1.eu.hivemq.cloud`
- **Port** — use **8883** (TLS). HiveMQ Cloud doesn't offer plaintext MQTT on 1883.

Then go to **Access Management** → **Add Credentials** and create a username/password. This is
what your backend and simulator authenticate with — it's not your HiveMQ account login.

Write all three down in `secrets.local.md` under a new `## HiveMQ Cloud` section:

```
HIVEMQ_HOST=xxxxxxxxxxxx.s1.eu.hivemq.cloud
HIVEMQ_USERNAME=sms-backend
HIVEMQ_PASSWORD=<the password you set>
```

## 3. Build the MQTT_URL

This project's `sms-backend/src/mqtt/client.js` calls `mqtt.connect(env.MQTT_URL)` — the `mqtt`
npm package reads the URL scheme itself and switches to TLS automatically, so no code changes
are needed. Only the URL format changes, from plain `mqtt://` to `mqtts://` with credentials
embedded:

```
MQTT_URL=mqtts://<username>:<password>@<host>:8883
```

Example, using the values above:

```
MQTT_URL=mqtts://sms-backend:yourpassword123@xxxxxxxxxxxx.s1.eu.hivemq.cloud:8883
```

If your password contains special characters (`@`, `:`, `/`, `#`, etc.), URL-encode them —
e.g. `p@ss:word` becomes `p%40ss%3Aword` — otherwise the URL parses incorrectly. When in doubt,
avoid special characters when you set the HiveMQ password in step 2.

## 4. Where MQTT_URL goes

Set this **exact same value** in three places:

| Location | Purpose |
|---|---|
| `sms-backend/.env` (local) | so `npm run dev` works against the real broker locally |
| Render → `sms-backend` Web Service → Environment | production backend (DEPLOY.md step 2.3) |
| Render → simulator Background Worker → Environment | fake telemetry publisher (DEPLOY.md step 2.4) |

You do **not** need a `sms-mosquitto` Private Service on Render at all anymore — skip that
service entirely. Delete it if you already created one, to stop it from being billed.

## 5. Update DEPLOY.md's env var lists

In DEPLOY.md steps 2.3 and 2.4, wherever you see:

```
MQTT_URL=mqtt://<mosquitto internal address from step 2.2>
```

replace it with the `mqtts://` value from step 3 above. Everything else in those steps
(`DATABASE_URL`, `JWT_SECRET`, etc.) is unchanged.

## 6. Test the connection before deploying

From your machine, with the `mqtt` npm package already a dependency of `sms-backend`:

```bash
cd sms-backend
node -e "
const mqtt = require('mqtt');
const client = mqtt.connect('mqtts://<username>:<password>@<host>:8883');
client.on('connect', () => { console.log('connected!'); client.end(); });
client.on('error', (e) => { console.error('failed:', e.message); process.exit(1); });
"
```

`connected!` confirms your credentials and URL are correct before you wire them into Render.

## 7. Verify end-to-end after deploying

Once `sms-backend` and the simulator worker are both deployed on Render with the same
`MQTT_URL`:

- Simulator logs should show it publishing (`[sim] site-1 publishing telemetry...` or similar).
- Backend logs should show `[mqtt] connected to mqtts://...` followed by incoming messages.
- The Overview page (once the frontend is running) should populate with live data — this is the
  same acceptance check as DEPLOY.md's checklist, just with HiveMQ Cloud standing in for
  Mosquitto.
