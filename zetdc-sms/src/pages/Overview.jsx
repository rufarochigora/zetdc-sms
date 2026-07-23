import { useEffect, useState } from 'react';
import { http } from '../api/httpClient';
import { getSocket } from '../api/socketClient';
import { useAuth } from '../context/AuthContext';
import SubstationCard from '../components/SubstationCard';

export default function Overview() {
  const { token } = useAuth();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    http
      .get('/api/sites')
      .then((data) => !cancelled && setSites(data))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the fleet grid's status dots live without a page refresh.
  useEffect(() => {
    const socket = getSocket(token);
    const onStatus = ({ siteId, status }) => {
      setSites((prev) => prev.map((s) => (s.id === siteId ? { ...s, status } : s)));
    };
    socket.on('site:status', onStatus);
    return () => socket.off('site:status', onStatus);
  }, [token]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Fleet Overview</p>
        <h1 className="text-xl font-semibold text-ink mt-1">{sites.length} Substations</h1>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading sites...</p>
      ) : sites.length === 0 ? (
        <p className="text-sm text-muted">No sites yet. Run the simulator or seed script to populate demo data.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <SubstationCard key={site.id} site={site} />
          ))}
        </div>
      )}
    </div>
  );
}
