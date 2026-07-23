const SEVERITY_STYLE = {
  critical: 'text-crit bg-crit/10 border-crit/30',
  warning: 'text-warn bg-warn/10 border-warn/30',
  info: 'text-info bg-info/10 border-info/30',
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export default function AlarmFeed({ alarms, onAcknowledge, onClear }) {
  return (
    <div className="rounded-lg bg-surface border border-line p-4">
      <h3 className="text-xs font-mono uppercase tracking-wide text-muted mb-3">Alarm Feed</h3>

      {alarms.length === 0 && <p className="text-sm text-muted">No active alarms.</p>}

      <ul className="space-y-2">
        {alarms.map((alarm) => (
          <li
            key={alarm.id}
            className={`rounded border px-3 py-2 ${SEVERITY_STYLE[alarm.severity] || 'border-line'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm">{alarm.message}</p>
                <p className="text-xs font-mono opacity-70 mt-0.5">
                  {alarm.type} · {timeAgo(alarm.createdAt)}
                  {alarm.state === 'acknowledged' && ` · ack'd by ${alarm.acknowledgedBy}`}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {alarm.state === 'new' && (
                  <button
                    onClick={() => onAcknowledge(alarm.id)}
                    className="text-xs font-mono px-2 py-1 rounded border border-current hover:bg-ink/10"
                  >
                    Acknowledge
                  </button>
                )}
                <button
                  onClick={() => onClear(alarm.id)}
                  className="text-xs font-mono px-2 py-1 rounded border border-current hover:bg-ink/10"
                >
                  Clear
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
