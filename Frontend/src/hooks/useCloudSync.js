import { useState, useEffect, useCallback } from 'react';
import { makeSnapshot, storeSnapshot, flushPending, countPending } from '../utils/cloudSync';

const NOTICE_MS = 3000;

// Device connectivity and the black box: how many snapshots wait on this device, and a way to
// send the current astronaut's readings. Pending data is sent when the connection returns.
export function useCloudSync() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [pending, setPending] = useState(0);
  const [notice, setNotice] = useState(null);

  const refreshPending = useCallback(async () => {
    try {
      setPending(await countPending());
    } catch {
      // IndexedDB unavailable (e.g. private mode): nothing can be stored on the device
    }
  }, []);

  useEffect(() => {
    const sync = async () => {
      try {
        await flushPending();
      } catch {
        // Cloud still unreachable: data stays in the black box for the next attempt
      }
      refreshPending();
    };
    const onOnline = () => {
      setIsOnline(true);
      sync();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    sync();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refreshPending]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const sendSnapshot = useCallback(
    async (member) => {
      try {
        const where = await storeSnapshot(makeSnapshot(member));
        setNotice(where === 'cloud' ? 'Sent to cloud' : 'Saved on device');
      } catch {
        setNotice('Could not save');
      }
      refreshPending();
    },
    [refreshPending]
  );

  return { isOnline, pending, notice, sendSnapshot };
}
