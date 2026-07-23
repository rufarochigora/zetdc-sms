import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { http } from '../api/httpClient';
import { useLiveData } from '../hooks/useLiveData';
import { useAlarms } from '../hooks/useAlarms';
import BatteryPanel from '../components/BatteryPanel';
import BreakerStatus from '../components/BreakerStatus';
import TransformerStatus from '../components/TransformerStatus';
import AlarmFeed from '../components/AlarmFeed';
import TrendChart from '../components/TrendChart';

const STATUS_STYLE = {
  online: 'text-ok bg-ok/10',
  offline: 'text-crit bg-crit/10',
  stale: 'text-warn bg-warn/10',
  unknown: 'text-muted bg-line',
};

export default function SubstationDetail() {
  const { id } = useParams();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const { latestByMetric, status } = useLiveData(id);
  const { alarms, acknowledge, clear } = useAlarms(id);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    http
      .get(`/api/sites/${id}`)
      .then((data) => !cancelled && setSite(data))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const liveStatus = status || site?.status || 'unknown';
  const liveVoltage = latestByMetric.batteryVoltage?.value;

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-muted">Loading...</div>;
  if (!site) return <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-crit">Site not found.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/" className="text-xs font-mono text-accent hover:underline">
        ← Fleet Overview
      </Link>

      <div className="mt-3 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{site.voltageLevel}</p>
          <h1 className="text-2xl font-semibold text-ink mt-1">{site.name}</h1>
          {site.location && <p className="text-sm text-muted mt-0.5">{site.location}</p>}
        </div>
        <span className={`text-xs font-mono px-3 py-1 rounded ${STATUS_STYLE[liveStatus] || STATUS_STYLE.unknown}`}>
          {liveStatus.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <BatteryPanel batteryBank={site.batteryBanks?.[0]} latestVoltage={liveVoltage} />
          <BreakerStatus breakers={site.breakers} />
          <TransformerStatus transformers={site.transformers} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <TrendChart siteId={id} />
          <AlarmFeed alarms={alarms} onAcknowledge={acknowledge} onClear={clear} />
        </div>
      </div>
    </div>
  );
}
