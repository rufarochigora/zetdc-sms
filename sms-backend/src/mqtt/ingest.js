const prisma = require('../db/postgres');
const { connectMqtt } = require('./client');
const alarmEngine = require('../alarms/engine');

const TELEMETRY_METRICS = ['batteryVoltage', 'batteryCurrent'];

function isValidTelemetry(payload) {
  return (
    payload &&
    typeof payload.timestamp === 'string' &&
    (payload.batteryVoltage === undefined || typeof payload.batteryVoltage === 'number') &&
    (payload.batteryCurrent === undefined || typeof payload.batteryCurrent === 'number')
  );
}

function isValidEvent(payload) {
  return payload && typeof payload.timestamp === 'string' && typeof payload.type === 'string';
}

/**
 * Deliberately NOT decoupled into separate queues (per spec: "don't
 * decouple these into separate queues for a pilot-scale system"). Each
 * message does validate -> write -> evaluate alarms -> broadcast in one
 * pass, synchronously within this handler.
 */
async function handleMessage(io, { siteId, kind, payload }) {
  try {
    const site = await prisma.site.upsert({
      where: { id: siteId },
      update: {},
      create: { id: siteId, name: siteId, voltageLevel: '11kV', status: 'online' },
    });

    if (site.status !== 'online' && kind !== 'status') {
      await prisma.site.update({ where: { id: siteId }, data: { status: 'online' } });
      io.to(`site:${siteId}`).emit('site:status', { siteId, status: 'online' });
    }

    alarmEngine.markSiteAlive(siteId);

    if (kind === 'telemetry') {
      if (!isValidTelemetry(payload)) {
        console.warn(`[ingest] rejected malformed telemetry from ${siteId}`);
        return;
      }

      const timestamp = new Date(payload.timestamp);
      const readingRows = [];
      for (const metric of TELEMETRY_METRICS) {
        if (typeof payload[metric] === 'number') {
          readingRows.push({ siteId, metric, value: payload[metric], timestamp });
        }
      }
      if (readingRows.length) {
        await prisma.reading.createMany({ data: readingRows });
        for (const row of readingRows) {
          io.to(`site:${siteId}`).emit('reading:update', {
            siteId,
            metric: row.metric,
            value: row.value,
            timestamp: row.timestamp,
          });
        }
      }

      await alarmEngine.evaluateTelemetry(siteId, payload, io);
    } else if (kind === 'event') {
      if (!isValidEvent(payload)) {
        console.warn(`[ingest] rejected malformed event from ${siteId}`);
        return;
      }
      await alarmEngine.evaluateEvent(siteId, payload, io);
    } else if (kind === 'status') {
      // LWT topic: broker publishes this (typically { status: "offline" })
      // when a gateway disconnects ungracefully.
      const status = payload.status === 'offline' ? 'offline' : 'online';
      await prisma.site.update({ where: { id: siteId }, data: { status } });
      io.to(`site:${siteId}`).emit('site:status', { siteId, status });
    }
  } catch (err) {
    console.error(`[ingest] error handling ${kind} for site ${siteId}:`, err);
  }
}

/**
 * Wires the MQTT client to the ingest handler and starts the periodic
 * site_offline sweep. `io` is the Socket.IO server from ws/socket.js.
 */
function startIngestion(io) {
  const client = connectMqtt(({ siteId, kind, payload }) => {
    handleMessage(io, { siteId, kind, payload });
  });

  const env = require('../config/env');
  setInterval(() => {
    alarmEngine.sweepOfflineSites(io, env.SITE_OFFLINE_TIMEOUT_MS).catch((err) =>
      console.error('[ingest] offline sweep failed', err)
    );
  }, 15000);

  return client;
}

module.exports = { startIngestion, handleMessage };
