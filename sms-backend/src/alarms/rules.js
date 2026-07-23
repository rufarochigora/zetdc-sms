// Alarm rule table - implements Section 5 of the build spec literally.
// Each rule is a pure function: (context) => { fire: boolean, message?: string }
// `context` shapes differ slightly per rule family (telemetry vs event vs timeout);
// see engine.js for how each is invoked.

const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

const ALARM_TYPES = {
  LOW_BATTERY: 'low_battery',
  CHARGER_FAULT: 'charger_fault',
  BREAKER_MAINTENANCE: 'breaker_maintenance',
  RELAY_OPERATION: 'relay_operation',
  TRANSFORMER_DEENERGIZED: 'transformer_deenergized',
  SITE_OFFLINE: 'site_offline',
};

// notify: which channels this alarm type should trigger. Consumed by
// notifications/sms.js and notifications/email.js dispatch logic.
const NOTIFY = {
  [ALARM_TYPES.LOW_BATTERY]: ['email'],
  [ALARM_TYPES.CHARGER_FAULT]: ['sms', 'email'],
  [ALARM_TYPES.BREAKER_MAINTENANCE]: ['email'],
  [ALARM_TYPES.RELAY_OPERATION]: ['sms', 'email'],
  [ALARM_TYPES.TRANSFORMER_DEENERGIZED]: ['sms', 'email'],
  [ALARM_TYPES.SITE_OFFLINE]: ['email'],
};

const rules = {
  /**
   * batteryVoltage < lowVoltageThreshold => low_battery / warning / email
   */
  lowBattery({ batteryVoltage, lowVoltageThreshold }) {
    if (typeof batteryVoltage !== 'number') return { fire: false };
    if (batteryVoltage < lowVoltageThreshold) {
      return {
        fire: true,
        type: ALARM_TYPES.LOW_BATTERY,
        severity: SEVERITY.WARNING,
        message: `Battery voltage ${batteryVoltage.toFixed(1)}V is below threshold ${lowVoltageThreshold.toFixed(1)}V`,
      };
    }
    return { fire: false };
  },

  /**
   * chargerOk transitions true -> false => charger_fault / critical / sms+email
   */
  chargerFault({ previousChargerOk, chargerOk }) {
    if (previousChargerOk === true && chargerOk === false) {
      return {
        fire: true,
        type: ALARM_TYPES.CHARGER_FAULT,
        severity: SEVERITY.CRITICAL,
        message: 'Battery charger has faulted (OK -> fault transition detected)',
      };
    }
    return { fire: false };
  },

  /**
   * Breaker operationCount crosses maintenanceThreshold => breaker_maintenance / info / email
   */
  breakerMaintenance({ label, previousOperationCount, operationCount, maintenanceThreshold }) {
    const crossed =
      typeof previousOperationCount === 'number' &&
      previousOperationCount < maintenanceThreshold &&
      operationCount >= maintenanceThreshold;
    if (crossed) {
      return {
        fire: true,
        type: ALARM_TYPES.BREAKER_MAINTENANCE,
        severity: SEVERITY.INFO,
        message: `Breaker "${label}" operation count (${operationCount}) has crossed the maintenance threshold (${maintenanceThreshold})`,
      };
    }
    return { fire: false };
  },

  /**
   * Any relay event received => relay_operation / critical / sms+email, push instantly via WS
   */
  relayOperation({ relayLabel, target }) {
    return {
      fire: true,
      type: ALARM_TYPES.RELAY_OPERATION,
      severity: SEVERITY.CRITICAL,
      message: `Relay "${relayLabel}" operated - target: ${target || 'unknown'}`,
    };
  },

  /**
   * Transformer energized transitions true -> false unexpectedly => transformer_deenergized / critical / sms+email
   */
  transformerDeenergized({ label, previousEnergized, energized }) {
    if (previousEnergized === true && energized === false) {
      return {
        fire: true,
        type: ALARM_TYPES.TRANSFORMER_DEENERGIZED,
        severity: SEVERITY.CRITICAL,
        message: `Transformer "${label}" has de-energized unexpectedly`,
      };
    }
    return { fire: false };
  },

  /**
   * No MQTT message from a site for > timeoutMs (LWT or timeout) => site_offline / warning / email
   */
  siteOffline({ msSinceLastMessage, timeoutMs }) {
    if (typeof msSinceLastMessage === 'number' && msSinceLastMessage > timeoutMs) {
      return {
        fire: true,
        type: ALARM_TYPES.SITE_OFFLINE,
        severity: SEVERITY.WARNING,
        message: `No telemetry received for ${Math.round(msSinceLastMessage / 1000)}s (timeout: ${Math.round(timeoutMs / 1000)}s)`,
      };
    }
    return { fire: false };
  },
};

module.exports = { rules, SEVERITY, ALARM_TYPES, NOTIFY };
