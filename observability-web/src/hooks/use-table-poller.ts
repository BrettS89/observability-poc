import { useEffect, useRef, useState } from 'react';
import { getTables, type TablesPayload } from '../api/calls';

export function useTablesPoller() {
  const cancelRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const stoppedRef = useRef(false);

  const [data, setData] = useState<TablesPayload | null>(null);

  useEffect(() => {
    stoppedRef.current = false;

    const poll = async () => {
      if (stoppedRef.current) return;

      // Pause polling in background tabs
      if (document.visibilityState !== 'visible') {
        timeoutRef.current = window.setTimeout(poll, 60_000);
        return;
      }

      // Prevent overlapping requests
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      // Abort any prior request
      cancelRef.current?.abort();
      const controller = new AbortController();
      cancelRef.current = controller;

      try {
        const tables = await getTables();
        setData(tables);
      } catch (e: any) {
        // swallow errors; tables should not break the UI
      } finally {
        inFlightRef.current = false;

        // Add jitter so multiple clients don’t sync up
        const jitter = Math.floor(Math.random() * 5_000); // up to 5s
        timeoutRef.current = window.setTimeout(poll, 60_000 + jitter);
      }
    };

    poll();

    return () => {
      stoppedRef.current = true;
      cancelRef.current?.abort();
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return data;
}
