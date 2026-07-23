const prisma = require('../db/postgres');
const { rules, NOTIFY } = require('./rules');
const { sendSms } = require('../notifications/sms');
const { sendEmail } = require('../notifications/email');

// In-memory cache of last-seen values, used only to detect *transitions*
// (charger true->false, transformer energized true->false, breaker count
// crossing threshold) and to track per-site last-message time for the
// site_offline timeout rule. This is fine to lose on restart - the alarm
// state itself lives in Postgres, this cache just re-warms from the next
// telemetry message.
const lastSeen = new Map(); // siteId -> { batteryVoltage, chargerOk, breakers: {label: count}, transformers: {label: energized}, lastMessageAt }

function getSiteCache(siteId) {
  if (!lastSeen.has(siteId)) {
    lastSeen.set(siteId, { chargerOk: undefined, breakers: {}, transformers: {}, lastMessageAt: null });
  }
  return lastSeen.get(siteId);
}

/**
 * Opens a new alarm unless an open (new/acknowledged) alarm of the same
 * type already exists for this site - "each rule fires at most one open
 * alarm of the same type per site at a time".
 */
async function openAlarmIfNotDuplicate({ siteId, type, severity, message }, io) {
  const existing = await prisma.alarm.findFirst({
    where: { siteId, type, state: { in: ['new', 'acknowledged'] } },
  });
  if (existing) return null;

  const alarm = await prisma.alarm.create({
    data: { siteId, type, severity, message },
  });

  if (io) {
    io.to(`site:${siteId}`).emit('alarm:new', alarm);
  }

  const channels = NOTIFY[type] || [];
  if (channels.includes('sms')) sendSms(alarm).catch((err) => console.error('[alarms] sms notify failed', err));
  if (channels.includes('email')) sendEmail(alarm).catch((err) => console.error('[alarms] email notify failed', err));

  return alarm;
}

/**
 * Evaluate all telemetry-based rules against one incoming telemetry payload.
 * Called from mqtt/ingest.js for every `sms/{siteId}/telemetry` message.
 */
async function evaluateTelemetry(siteId, payload, io) {
  const cache = getSiteCache(siteId);
  cache.lastMessageAt = Date.now();

  const batteryBank = await prisma.batteryBank.findFirst({ where: { siteId } });
  if (batteryBank && typeof payload.batteryVoltage === 'number') {
    const result = rules.lowBattery({
      batteryVoltage: payload.batteryVoltage,
      lowVoltageThreshold: batteryBank.lowVoltageThreshold,
    });
    if (result.fire) {
      await openAlarmIfNotDuplicate({ siteId, ...result }, io);
    }
  }

  if (typeof payload.chargerOk === 'boolean') {
    const chargerResult = rules.chargerFault({
      previousChargerOk: cache.chargerOk,
      chargerOk: payload.chargerOk,
    });
    if (chargerResult.fire) {
      await openAlarmIfNotDuplicate({ siteId, ...chargerResult }, io);
    }
    cache.chargerOk = payload.chargerOk;
    if (batteryBank && batteryBank.chargerOk !== payload.chargerOk) {
      await prisma.batteryBank.update({ where: { id: batteryBank.id }, data: { chargerOk: payload.chargerOk } });
    }
  }

  if (Array.isArray(payload.breakers)) {
    for (const b of payload.breakers) {
      const breaker = await prisma.breaker.findFirst({ where: { siteId, label: b.label } });
      if (!breaker) continue;

      // A breaker toggling closed state counts as one operation.
      let operationCount = breaker.operationCount;
      if (typeof b.closed === 'boolean' && b.closed !== breaker.isClosed) {
        operationCount += 1;
      }

      const maintResult = rules.breakerMaintenance({
        label: breaker.label,
        previousOperationCount: breaker.operationCount,
        operationCount,
        maintenanceThreshold: breaker.maintenanceThreshold,
      });

      if (operationCount !== breaker.operationCount || b.closed !== breaker.isClosed) {
        await prisma.breaker.update({
          where: { id: breaker.id },
          data: { operationCount, isClosed: b.closed ?? breaker.isClosed },
        });
      }

      if (maintResult.fire) {
        await openAlarmIfNotDuplicate({ siteId, ...maintResult }, io);
      }
    }
  }

  if (Array.isArray(payload.transformers)) {
    for (const t of payload.transformers) {
      const transformer = await prisma.transformer.findFirst({ where: { siteId, label: t.label } });
      if (!transformer) continue;

      const result = rules.transformerDeenergized({
        label: transformer.label,
        previousEnergized: transformer.energized,
        energized: t.energized,
      });

      if (typeof t.energized === 'boolean' && t.energized !== transformer.energized) {
        await prisma.transformer.update({ where: { id: transformer.id }, data: { energized: t.energized } });
      }

      if (result.fire) {
        await openAlarmIfNotDuplicate({ siteId, ...result }, io);
      }
    }
  }
}

/**
 * Evaluate the relay_operation rule for one discrete event message.
 * Called from mqtt/ingest.js for every `sms/{siteId}/event` message.
 */
async function evaluateEvent(siteId, payload, io) {
  const cache = getSiteCache(siteId);
  cache.lastMessageAt = Date.now();

  if (payload.type === 'relay_operation') {
    const relay = await prisma.relay.findFirst({ where: { siteId, label: payload.relayLabel } });
    if (relay) {
      await prisma.relay.update({ where: { id: relay.id }, data: { lastTarget: payload.target || null } });
    }
    const result = rules.relayOperation({ relayLabel: payload.relayLabel, target: payload.target });
    // Relay operations are always notable events, not deduplicated the same
    // way as persistent conditions - each operation is its own alarm.
    const alarm = await prisma.alarm.create({
      data: { siteId, type: result.type, severity: result.severity, message: result.message },
    });
    if (io) io.to(`site:${siteId}`).emit('alarm:new', alarm);
    sendSms(alarm).catch((err) => console.error('[alarms] sms notify failed', err));
    sendEmail(alarm).catch((err) => console.error('[alarms] email notify failed', err));
  }
}

/**
 * Records that a message was received (used by status topic / general
 * ingest activity) so the offline-timeout sweep has fresh data.
 */
function markSiteAlive(siteId) {
  getSiteCache(siteId).lastMessageAt = Date.now();
}

/**
 * Periodic sweep (called on an interval from server.js) that checks every
 * known site's last-message time against SITE_OFFLINE_TIMEOUT_MS and fires
 * site_offline alarms for any that have gone quiet.
 */
async function sweepOfflineSites(io, timeoutMs) {
  const sites = await prisma.site.findMany();
  const now = Date.now();

  for (const site of sites) {
    const cache = getSiteCache(site.id);
    if (!cache.lastMessageAt) continue; // never heard from this site yet this run

    const msSinceLastMessage = now - cache.lastMessageAt;
    const result = rules.siteOffline({ msSinceLastMessage, timeoutMs });

    const newStatus = result.fire ? 'offline' : 'online';
    if (site.status !== newStatus) {
      await prisma.site.update({ where: { id: site.id }, data: { status: newStatus } });
      if (io) io.to(`site:${site.id}`).emit('site:status', { siteId: site.id, status: newStatus });
    }

    if (result.fire) {
      await openAlarmIfNotDuplicate({ siteId: site.id, ...result }, io);
    }
  }
}

module.exports = {
  evaluateTelemetry,
  evaluateEvent,
  markSiteAlive,
  sweepOfflineSites,
  openAlarmIfNotDuplicate,
};
