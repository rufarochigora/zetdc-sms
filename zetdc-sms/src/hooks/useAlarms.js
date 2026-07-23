import { useMemo } from 'react';
import { useAlarmContext } from '../context/AlarmContext';

/**
 * Thin selector over AlarmContext. Pass a siteId to scope the list to one
 * substation (used by AlarmFeed on SubstationDetail); omit it for the
 * full fleet-wide list.
 */
export function useAlarms(siteId) {
  const { alarms, acknowledge, clear } = useAlarmContext();

  const filtered = useMemo(
    () => (siteId ? alarms.filter((a) => a.siteId === siteId) : alarms),
    [alarms, siteId]
  );

  return { alarms: filtered, acknowledge, clear };
}
