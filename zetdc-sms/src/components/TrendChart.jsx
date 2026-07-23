import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { http } from '../api/httpClient';

const METRICS = [
  { value: 'batteryVoltage', label: 'Battery Voltage (V)' },
  { value: 'batteryCurrent', label: 'Battery Current (A)' },
];

export default function TrendChart({ siteId }) {
  const [metric, setMetric] = useState('batteryVoltage');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    setLoading(true);
    const from = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(); // last 6h
    http
      .get(`/api/sites/${siteId}/readings?metric=${metric}&from=${from}`)
      .then((rows) => {
        if (cancelled) return;
        setData(
          rows.map((r) => ({
            time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            value: r.value,
          }))
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [siteId, metric]);

  return (
    <div className="rounded-lg bg-surface border border-line p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-mono uppercase tracking-wide text-muted">Trend</h3>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          className="bg-raised border border-line rounded text-xs font-mono px-2 py-1 text-ink"
        >
          {METRICS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="h-56">
        {loading && data.length === 0 ? (
          <p className="text-sm text-muted">Loading...</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted">No readings yet for this range.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262F3D" />
              <XAxis dataKey="time" stroke="#8892A0" fontSize={11} tickLine={false} />
              <YAxis stroke="#8892A0" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: '#1B222D', border: '1px solid #262F3D', fontSize: 12 }}
                labelStyle={{ color: '#8892A0' }}
              />
              <Line type="monotone" dataKey="value" stroke="#3FD1C7" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
