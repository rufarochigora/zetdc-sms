export default function BreakerStatus({ breakers = [] }) {
  return (
    <div className="rounded-lg bg-surface border border-line p-4">
      <h3 className="text-xs font-mono uppercase tracking-wide text-muted mb-3">Breakers</h3>
      <div className="space-y-3">
        {breakers.length === 0 && <p className="text-sm text-muted">No breakers configured.</p>}
        {breakers.map((b) => {
          const dueForMaintenance = b.operationCount >= b.maintenanceThreshold;
          const pct = Math.min(100, Math.round((b.operationCount / b.maintenanceThreshold) * 100));
          return (
            <div key={b.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-ink truncate">{b.label}</p>
                <p className="text-xs text-faint font-mono">
                  {b.operationCount} / {b.maintenanceThreshold} ops
                  {dueForMaintenance && <span className="text-warn ml-2">MAINTENANCE DUE</span>}
                </p>
                <div className="mt-1 h-1 w-32 rounded bg-line overflow-hidden">
                  <div
                    className={`h-full ${dueForMaintenance ? 'bg-warn' : 'bg-accent'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span
                className={`shrink-0 text-xs font-mono px-2 py-0.5 rounded ${
                  b.isClosed ? 'text-ok bg-ok/10' : 'text-muted bg-line'
                }`}
              >
                {b.isClosed ? 'CLOSED' : 'OPEN'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
