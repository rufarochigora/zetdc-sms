import { useNavigate } from 'react-router-dom';

const SEVERITY_STYLES = {
  critical: { ring: 'ring-crit/60', dot: 'bg-crit', label: 'Critical' },
  warning: { ring: 'ring-warn/60', dot: 'bg-warn', label: 'Warning' },
  info: { ring: 'ring-info/60', dot: 'bg-info', label: 'Info' },
  null: { ring: 'ring-ok/40', dot: 'bg-ok', label: 'Normal' },
};

export default function SubstationCard({ site }) {
  const navigate = useNavigate();
  const style = SEVERITY_STYLES[site.worstActiveAlarmSeverity] || SEVERITY_STYLES.null;
  const isOnline = site.status === 'online';

  return (
    <button
      onClick={() => navigate(`/sites/${site.id}`)}
      className={`text-left w-full rounded-lg bg-surface border border-line ring-1 ${style.ring} p-4 hover:bg-raised transition-colors focus-visible:outline-2 focus-visible:outline-accent`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-mono text-sm font-semibold text-ink">{site.name}</h3>
          <p className="text-xs text-muted mt-0.5">{site.voltageLevel} · {site.location || 'Unknown location'}</p>
        </div>
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${style.dot} ${isOnline ? 'animate-pulse-slow' : ''}`} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs font-mono text-faint uppercase tracking-wide">
          {isOnline ? 'Live' : site.status}
        </span>
        <span className="text-xs font-mono text-muted">{style.label}</span>
      </div>
    </button>
  );
}
