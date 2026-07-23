export default function TransformerStatus({ transformers = [] }) {
  return (
    <div className="rounded-lg bg-surface border border-line p-4">
      <h3 className="text-xs font-mono uppercase tracking-wide text-muted mb-3">Transformers</h3>
      <div className="space-y-2">
        {transformers.length === 0 && <p className="text-sm text-muted">No transformers configured.</p>}
        {transformers.map((t) => (
          <div key={t.id} className="flex items-center justify-between">
            <p className="text-sm text-ink">{t.label}</p>
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded ${
                t.energized ? 'text-ok bg-ok/10' : 'text-crit bg-crit/10'
              }`}
            >
              {t.energized ? 'ENERGIZED' : 'DE-ENERGIZED'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
