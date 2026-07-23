import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../api/socketClient';
import { useAuth } from '../context/AuthContext';

/**
 * Subscribes to `site:{siteId}` and tracks the latest value per metric,
 * plus site online/offline/stale status pushes, live.
 */
export function useLiveData(siteId) {
  const { token } = useAuth();
  const [latestByMetric, setLatestByMetric] = useState({});
  const [status, setStatus] = useState(null);
  const historyRef = useRef({}); // metric -> [{value, timestamp}], capped

  useEffect(() => {
    if (!siteId) return;
    const socket = getSocket(token);
    socket.emit('subscribe', { siteId });

    const onReading = (payload) => {
      if (payload.siteId !== siteId) return;
      setLatestByMetric((prev) => ({ ...prev, [payload.metric]: payload }));

      const arr = historyRef.current[payload.metric] || [];
      arr.push({ value: payload.value, timestamp: payload.timestamp });
      if (arr.length > 200) arr.shift();
      historyRef.current[payload.metric] = arr;
    };

    const onStatus = (payload) => {
      if (payload.siteId !== siteId) return;
      setStatus(payload.status);
    };

    socket.on('reading:update', onReading);
    socket.on('site:status', onStatus);

    return () => {
      socket.emit('unsubscribe', { siteId });
      socket.off('reading:update', onReading);
      socket.off('site:status', onStatus);
    };
  }, [siteId, token]);

  return { latestByMetric, status, history: historyRef.current };
}
