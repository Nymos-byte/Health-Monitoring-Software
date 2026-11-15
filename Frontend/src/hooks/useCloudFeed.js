import { useState, useEffect, useMemo } from 'react';

const ENDPOINT = '/api/telemetry';
const POLL_MS = 5000;
// A device that has not reported for this long no longer counts as live
const STALE_MS = 2 * 60000;

function toSample(record) {
  const at = Date.parse(record.timestamp);
  return {
    ...record.constantes,
    activity_level: record.actividad,
    event: record.evento,
    timestamp: at,
    time: new Date(at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}

// Replaces an astronaut's simulated ground copy with what their device stored in Azure,
// as long as it reported recently for the task they are doing now
function mergeMember(member, records, now) {
  const own = records
    .filter((r) => r.astronauta_id === member.id && r.tarea === member.taskId)
    .map(toSample)
    .sort((a, b) => a.timestamp - b.timestamp);
  const latest = own[own.length - 1];
  if (!latest || now - latest.timestamp > STALE_MS) return member;

  const { time: _time, timestamp: _timestamp, ...readings } = latest;
  const earlier = member.data.vitals.filter((v) => v.timestamp < own[0].timestamp);
  return {
    ...member,
    source: 'azure',
    cloudAt: latest.timestamp,
    data: {
      ...member.data,
      currentVitals: { ...member.data.currentVitals, ...readings },
      vitals: [...earlier, ...own].slice(-50),
    },
  };
}

// Ground Control's view of Azure Cosmos DB: polls the live telemetry the crew devices uploaded
// and uses it for every astronaut whose device is reporting. Everyone else keeps the simulation,
// so the console never looks empty. `status`: 'off', 'connecting', 'live', 'unconfigured' or
// 'unreachable'.
export function useCloudFeed(groundData, enabled) {
  const [feed, setFeed] = useState({ records: [], status: 'connecting', fetchedAt: null });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(ENDPOINT, { cache: 'no-store' });
        if (!res.ok) throw Object.assign(new Error(), { status: res.status });
        const { records } = await res.json();
        if (!cancelled) setFeed({ records, status: 'live', fetchedAt: Date.now() });
      } catch (error) {
        if (cancelled) return;
        const status = error.status === 503 ? 'unconfigured' : 'unreachable';
        setFeed((prev) => ({ ...prev, status }));
      }
    };
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled]);

  const data = useMemo(() => {
    if (!enabled || feed.status !== 'live') return groundData;
    return Object.fromEntries(
      Object.entries(groundData).map(([id, member]) => [id, mergeMember(member, feed.records, feed.fetchedAt)])
    );
  }, [groundData, feed, enabled]);

  const reporting = Object.values(data).filter((m) => m.source === 'azure').length;
  return { data, status: enabled ? feed.status : 'off', fetchedAt: feed.fetchedAt, reporting };
}
