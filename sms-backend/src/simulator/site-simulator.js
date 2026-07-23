/**
 * Standalone simulator - run separately from the backend server.
 * Fakes N unmanned substations publishing realistic telemetry over MQTT
 * so the whole pipeline (ingestion -> DB -> API -> WebSocket -> dashboard)
 * can be demoed end-to-end without any real RTU hardware.
 *
 * Each simulated site gets its OWN MQTT connection (own LWT on its status
 * topic), so you can kill any one connection independently to test the
 * site_offline alarm - e.g. run `SIM_SITE_IDS=site-1 node site-simulator.js`
 * in a separate terminal and Ctrl+C just that one to take a single site
 * "offline" without touching the others.
 *
 * Run with: node src/simulator/site-simulator.js
 */
require('dotenv').config();
const mqtt = require('mqtt');

const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';
const INTERVAL_MS = parseInt(process.env.SIM_INTERVAL_MS || '7000', 10);
const SITE_COUNT = parseInt(process.env.SIM_SITE_COUNT || '3', 10);
const SITE_IDS = process.env.SIM_SITE_IDS
  ? process.env.SIM_SITE_IDS.split(',').map((s) => s.trim())
  : Array.from({ length: SITE_COUNT }, (_, i) => `site-${i + 1}`);

const BREAKER_LABELS = ['HV Breaker', 'LV Breaker'];
const TRANSFORMER_LABELS = ['T1'];
const RELAY_LABELS = ['Feeder Relay 1', 'Feeder Relay 2'];
const RELAY_TARGETS = ['Overcurrent', 'Earth Fault', 'Differential'];

function jitter(baseMs, spreadMs) {
  return baseMs + Math.floor(Math.random() * spreadMs);
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

class SiteSimState {
  constructor(siteId) {
    this.siteId = siteId;
    this.batteryVoltage = 52.0; // healthy 48V-bank float voltage
    this.chargerOk = true;
    this.breakers = BREAKER_LABELS.map((label) => ({ label, closed: true }));
    this.transformers = TRANSFORMER_LABELS.map((label) => ({ label, energized: true }));
  }

  /** Random-walk the telemetry values, occasionally simulating a fault. */
  step() {
    // Battery drifts normally, with a small chance of a low-voltage dip.
    const dipping = Math.random() < 0.03;
    this.batteryVoltage += dipping ? randRange(-2.5, -0.5) : randRange(-0.15, 0.2);
    this.batteryVoltage = Math.max(40, Math.min(54, this.batteryVoltage));

    // Charger occasionally faults, then recovers a few cycles later.
    if (this.chargerOk && Math.random() < 0.01) this.chargerOk = false;
    else if (!this.chargerOk && Math.random() < 0.3) this.chargerOk = true;

    // Rare breaker toggle (counts as an "operation" on the backend).
    if (Math.random() < 0.02) {
      const b = this.breakers[Math.floor(Math.random() * this.breakers.length)];
      b.closed = !b.closed;
    }

    // Very rare unexpected transformer de-energization.
    if (Math.random() < 0.005) {
      const t = this.transformers[Math.floor(Math.random() * this.transformers.length)];
      t.energized = !t.energized;
    }
  }

  telemetryPayload() {
    return {
      timestamp: new Date().toISOString(),
      batteryVoltage: Number(this.batteryVoltage.toFixed(2)),
      batteryCurrent: Number(randRange(1.5, 4.5).toFixed(2)),
      chargerOk: this.chargerOk,
      breakers: this.breakers.map((b) => ({ label: b.label, closed: b.closed })),
      transformers: this.transformers.map((t) => ({ label: t.label, energized: t.energized })),
    };
  }
}

function startSite(siteId) {
  const state = new SiteSimState(siteId);
  const statusTopic = `sms/${siteId}/status`;

  const client = mqtt.connect(MQTT_URL, {
    clientId: `sms-sim-${siteId}-${Math.random().toString(16).slice(2)}`,
    will: {
      topic: statusTopic,
      payload: JSON.stringify({ status: 'offline' }),
      qos: 1,
      retain: false,
    },
    reconnectPeriod: 2000,
  });

  client.on('connect', () => {
    console.log(`[sim:${siteId}] connected, publishing every ~${INTERVAL_MS}ms`);
    client.publish(statusTopic, JSON.stringify({ status: 'online' }));

    const tick = () => {
      state.step();
      client.publish(`sms/${siteId}/telemetry`, JSON.stringify(state.telemetryPayload()));

      // Occasionally fire a discrete relay operation event (high priority,
      // published on change - not part of the periodic telemetry tick).
      if (Math.random() < 0.04) {
        const relayLabel = RELAY_LABELS[Math.floor(Math.random() * RELAY_LABELS.length)];
        const target = RELAY_TARGETS[Math.floor(Math.random() * RELAY_TARGETS.length)];
        client.publish(
          `sms/${siteId}/event`,
          JSON.stringify({ timestamp: new Date().toISOString(), type: 'relay_operation', relayLabel, target })
        );
        console.log(`[sim:${siteId}] relay event: ${relayLabel} -> ${target}`);
      }

      setTimeout(tick, jitter(INTERVAL_MS - 1000, 2000)); // 5-10s-ish cadence
    };
    tick();
  });

  client.on('error', (err) => console.error(`[sim:${siteId}] error`, err.message));

  return client;
}

console.log(`[sim] starting ${SITE_IDS.length} simulated site(s): ${SITE_IDS.join(', ')}`);
const clients = SITE_IDS.map(startSite);

process.on('SIGINT', () => {
  console.log('\n[sim] shutting down...');
  clients.forEach((c) => c.end(true));
  process.exit(0);
});
