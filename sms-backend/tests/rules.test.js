const test = require('node:test');
const assert = require('node:assert/strict');
const { rules } = require('../src/alarms/rules');

test('lowBattery fires when voltage is below threshold', () => {
  const result = rules.lowBattery({ batteryVoltage: 44.0, lowVoltageThreshold: 46.0 });
  assert.equal(result.fire, true);
  assert.equal(result.type, 'low_battery');
  assert.equal(result.severity, 'warning');
});

test('lowBattery does not fire when voltage is healthy', () => {
  const result = rules.lowBattery({ batteryVoltage: 51.0, lowVoltageThreshold: 46.0 });
  assert.equal(result.fire, false);
});

test('chargerFault only fires on true -> false transition', () => {
  assert.equal(rules.chargerFault({ previousChargerOk: true, chargerOk: false }).fire, true);
  assert.equal(rules.chargerFault({ previousChargerOk: false, chargerOk: false }).fire, false);
  assert.equal(rules.chargerFault({ previousChargerOk: true, chargerOk: true }).fire, false);
});

test('breakerMaintenance fires only when crossing the threshold', () => {
  const crossing = rules.breakerMaintenance({
    label: 'HV Breaker',
    previousOperationCount: 1999,
    operationCount: 2000,
    maintenanceThreshold: 2000,
  });
  assert.equal(crossing.fire, true);

  const alreadyOver = rules.breakerMaintenance({
    label: 'HV Breaker',
    previousOperationCount: 2001,
    operationCount: 2002,
    maintenanceThreshold: 2000,
  });
  assert.equal(alreadyOver.fire, false, 'should not re-fire once already over');
});

test('siteOffline fires once timeout is exceeded', () => {
  assert.equal(rules.siteOffline({ msSinceLastMessage: 130000, timeoutMs: 120000 }).fire, true);
  assert.equal(rules.siteOffline({ msSinceLastMessage: 90000, timeoutMs: 120000 }).fire, false);
});

test('relayOperation always fires (every event is notable)', () => {
  const result = rules.relayOperation({ relayLabel: 'Feeder Relay 1', target: 'Overcurrent' });
  assert.equal(result.fire, true);
  assert.equal(result.severity, 'critical');
});
