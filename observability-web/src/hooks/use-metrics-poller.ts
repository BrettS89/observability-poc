import { useEffect, useRef, useState } from 'react';
import { getMetrics, type MetricsPayload } from '../api/calls';

export function useMetricsPoller() {
  const cancelRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const stoppedRef = useRef(false);

  const [data, setData] = useState<MetricsPayload | null>(null);

  useEffect(() => {
    stoppedRef.current = false;

    const poll = async () => {
      if (stoppedRef.current) return;

      // Pause polling in background tabs (optional but recommended)
      if (document.visibilityState !== 'visible') {
        timeoutRef.current = window.setTimeout(poll, 10_000);
        return;
      }

      // No overlap
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      // Abort any prior request (belt + suspenders)
      cancelRef.current?.abort();
      const controller = new AbortController();
      cancelRef.current = controller;

      try {
        const metrics = await getMetrics();

        setData(metrics);
      } catch (e: any) {} finally {
        inFlightRef.current = false;

        const jitter = Math.floor(Math.random() * 2000);
        timeoutRef.current = window.setTimeout(poll, 10_000 + jitter);
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