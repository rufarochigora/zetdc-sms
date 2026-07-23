export default function BatteryPanel({ batteryBank, latestVoltage }) {
  if (!batteryBank) {
    return (
      <div className="rounded-lg bg-surface border border-line p-4">
        <p className="text-sm text-muted">No battery bank configured for this site.</p>
      </div>
    );
  }

  const voltage = latestVoltage ?? null;
  const low = voltage !== null && voltage < batteryBank.lowVoltageThreshold;

  return (
    <div className="rounded-lg bg-surface border border-line p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono uppercase tracking-wide text-muted">Battery Bank</h3>
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded ${
            batteryBank.chargerOk ? 'text-ok bg-ok/10' : 'text-crit bg-crit/10'
          }`}
        >
          Charger {batteryBank.chargerOk ? 'OK' : 'FAULT'}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className={`font-mono text-3xl tabular ${low ? 'text-crit' : 'text-ink'}`}>
          {voltage !== null ? voltage.toFixed(1) : '—'}
        </span>
        <span className="text-sm text-muted">V</span>
      </div>
      <p className="text-xs text-faint mt-1 font-mono">
        Threshold: {batteryBank.lowVoltageThreshold.toFixed(1)}V
      </p>
    </div>
  );
}
