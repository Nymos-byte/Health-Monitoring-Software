import { useState, useEffect, useRef, useCallback } from 'react';
import { SECTIONS, LINK_PROFILES } from '../data/mockData';

const TICK_MS = 1000;

function inScheduledOutage(profile, nowMs) {
  if (!profile.cycle) return false;
  const { period, outage, offset } = profile.cycle;
  const t = (Math.floor(nowMs / 1000) + offset) % period;
  return t >= period - outage;
}

// Telemetry samples recorded onboard in an environment that ground has not received yet
export function getBufferedSamples(groundData, onboardData, sectionId) {
  return Object.values(onboardData)
    .filter((member) => member.env === sectionId)
    .reduce((total, member) => {
      const received = groundData[member.id]?.data.vitals ?? [];
      const lastReceived = received[received.length - 1]?.timestamp ?? 0;
      return total + member.data.vitals.filter((v) => v.timestamp > lastReceived).length;
    }, 0);
}

function initialLinks(now) {
  return Object.fromEntries(
    SECTIONS.map((sec) => [
      sec.id,
      { profile: LINK_PROFILES[sec.id], status: 'aos', since: now, lastContact: now, lastSync: null },
    ])
  );
}

function advance(prev, onboard, forced, now) {
  const links = {};
  SECTIONS.forEach((sec) => {
    const prevLink = prev.links[sec.id];
    const down = forced.has(sec.id) || inScheduledOutage(prevLink.profile, now);

    if (down) {
      links[sec.id] = {
        ...prevLink,
        status: 'los',
        since: prevLink.status === 'los' ? prevLink.since : now,
      };
      return;
    }

    // Link back: everything held in the onboard buffer is sent in this sync
    const backlog =
      prevLink.status === 'los' ? getBufferedSamples(prev.groundData, onboard, sec.id) : 0;
    links[sec.id] = {
      ...prevLink,
      status: 'aos',
      since: prevLink.status === 'aos' ? prevLink.since : now,
      lastContact: now,
      lastSync: backlog ? { count: backlog, at: now } : prevLink.lastSync,
    };
  });

  // Ground keeps the last received copy of every astronaut whose environment is out of contact.
  // A new task assignment is known on the ground right away (ground issues it).
  const groundData = Object.fromEntries(
    Object.entries(onboard).map(([id, member]) => {
      const received = prev.groundData[id];
      const upToDate =
        links[member.env].status === 'aos' || !received || received.taskId !== member.taskId;
      return [id, upToDate ? member : received];
    })
  );

  return { groundData, links, now };
}

// Simulates the space-to-ground downlink with store-and-forward:
// the crew always sees onboard data; ground only sees what the link has delivered.
export function useDownlink(onboardData) {
  const onboardRef = useRef(onboardData);
  const [forcedLoss, setForcedLoss] = useState(() => new Set());
  const forcedRef = useRef(forcedLoss);
  const [state, setState] = useState(() => ({
    groundData: onboardData,
    links: initialLinks(Date.now()),
    now: Date.now(),
  }));

  useEffect(() => {
    onboardRef.current = onboardData;
  }, [onboardData]);

  useEffect(() => {
    const tick = () =>
      setState((prev) => advance(prev, onboardRef.current, forcedRef.current, Date.now()));
    const interval = setInterval(tick, TICK_MS);
    return () => clearInterval(interval);
  }, []);

  // Demo control: hold a phase's link down until toggled back
  const toggleLinkLoss = useCallback((sectionId) => {
    const next = new Set(forcedRef.current);
    if (next.has(sectionId)) next.delete(sectionId);
    else next.add(sectionId);
    forcedRef.current = next;
    setForcedLoss(next);
  }, []);

  return { ...state, forcedLoss, toggleLinkLoss };
}
