import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { http } from '../api/httpClient';
import { getSocket } from '../api/socketClient';
import { useAuth } from './AuthContext';

const AlarmContext = createContext(null);

const SEVERITY_TONE = { critical: 880, warning: 660, info: 440 };

function playTone(frequency) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = frequency;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio not available (autoplay policy, unsupported browser) - fine to skip.
  }
}

export function AlarmProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [alarms, setAlarms] = useState([]);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    const data = await http.get('/api/alarms?state=new');
    const ackData = await http.get('/api/alarms?state=acknowledged');
    setAlarms([...data, ...ackData].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    refresh();

    const socket = getSocket(token);

    const onNew = (alarm) => {
      setAlarms((prev) => [alarm, ...prev]);
      playTone(SEVERITY_TONE[alarm.severity] || 440);
      const id = ++toastIdRef.current;
      setToasts((prev) => [...prev, { id, alarm }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
    };

    const onUpdated = ({ id, state, acknowledgedBy }) => {
      setAlarms((prev) =>
        state === 'cleared'
          ? prev.filter((a) => a.id !== id)
          : prev.map((a) => (a.id === id ? { ...a, state, acknowledgedBy } : a))
      );
    };

    socket.on('alarm:new', onNew);
    socket.on('alarm:updated', onUpdated);

    return () => {
      socket.off('alarm:new', onNew);
      socket.off('alarm:updated', onUpdated);
    };
  }, [isAuthenticated, token, refresh]);

  const acknowledge = useCallback(async (id) => {
    const updated = await http.post(`/api/alarms/${id}/acknowledge`);
    setAlarms((prev) => prev.map((a) => (a.id === id ? updated : a)));
  }, []);

  const clear = useCallback(async (id) => {
    await http.post(`/api/alarms/${id}/clear`);
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({ alarms, toasts, acknowledge, clear, dismissToast, refresh }),
    [alarms, toasts, acknowledge, clear, dismissToast, refresh]
  );

  return <AlarmContext.Provider value={value}>{children}</AlarmContext.Provider>;
}

export function useAlarmContext() {
  const ctx = useContext(AlarmContext);
  if (!ctx) throw new Error('useAlarmContext must be used within AlarmProvider');
  return ctx;
}
