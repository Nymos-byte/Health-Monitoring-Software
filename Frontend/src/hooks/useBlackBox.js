import { useState, useEffect, useRef, useCallback } from 'react';
import { makeSnapshot, recordSnapshot, flushPending, countPending } from '../utils/cloudSync';

// How often the astronaut's device writes a record (demo pace; a real device would be slower)
const RECORD_MS = 15000;

// The astronaut's onboard black box. The device records the wearer's vitals on its own, keeps them
// while there is no link to ground, and sends everything stored as soon as the link is back.
// "Link" means both a working network connection and a downlink for the astronaut's environment.
export function useBlackBox(member, downlinkUp) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [stored, setStored] = useState(0);
  // Result of the last attempt to reach ground: 'synced', 'unconfigured' or 'unreachable'
  const [cloud, setCloud] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const connected = isOnline && downlinkUp;

  const memberRef = useRef(member);
  const connectedRef = useRef(connected);
  useEffect(() => {
    memberRef.current = member;
    connectedRef.current = connected;
  });

  const refresh = useCallback(async () => {
    try {
      setStored(await countPending());
    } catch {
      // IndexedDB unavailable (e.g. private mode): nothing can be kept on the device
    }
  }, []);

  const sync = useCallback(async () => {
    try {
      const sent = await flushPending();
      setCloud('synced');
      if (sent) setLastSync({ count: sent, at: Date.now() });
    } catch (error) {
      setCloud(error.status === 503 ? 'unconfigured' : 'unreachable');
    }
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Record continuously, whatever the link state
  useEffect(() => {
    const record = async () => {
      try {
        await recordSnapshot(makeSnapshot(memberRef.current));
      } catch {
        return;
      }
      if (connectedRef.current) sync();
      else refresh();
    };
    const interval = setInterval(record, RECORD_MS);
    const first = setTimeout(refresh, 0);
    return () => {
      clearInterval(interval);
      clearTimeout(first);
    };
  }, [sync, refresh]);

  // Link back: send what the black box kept during the outage
  useEffect(() => {
    if (!connected) return;
    const timer = setTimeout(sync, 0);
    return () => clearTimeout(timer);
  }, [connected, sync]);

  return { connected, isOnline, stored, cloud, lastSync };
}
