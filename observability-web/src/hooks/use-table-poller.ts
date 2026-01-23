import { useEffect, useMemo, useRef, useState } from "react";
import { getTables, type TablesPayload } from "../api/calls";

type Range = "5m" | "15m" | "1h";
// optional: keep tables less chatty than charts, but still scale with range
const pollMsByRange: Record<Range, number> = {
  "5m": 30_000,    // faster feedback, still safe
  "15m": 60_000,
  "1h": 60_000,
};

export function useTablesPoller(range: Range) {
  console.log(range);
  const pollMs = useMemo(() => {
    const ms = pollMsByRange[range];
    return Math.max(10_000, ms ?? 60_000);
  }, [range]);

  const [data, setData] = useState<TablesPayload | null>(null);

  const cancelRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const stoppedRef = useRef(false);

  // ✅ request-id guard: only the newest request is allowed to update state
  const reqIdRef = useRef(0);

  useEffect(() => {
    stoppedRef.current = false;

    const poll = async () => {
      if (stoppedRef.current) return;

      // Pause polling in background tabs
      if (document.visibilityState !== "visible") {
        timeoutRef.current = window.setTimeout(poll, pollMs);
        return;
      }

      // Prevent overlapping requests
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      // Abort any prior request
      cancelRef.current?.abort();
      const controller = new AbortController();
      cancelRef.current = controller;

      // ✅ bump request id for THIS attempt
      const reqId = ++reqIdRef.current;

      try {
        const tables = await getTables({ range, signal: controller.signal } as any);

        // ✅ ignore stale responses (range changed / new request started)
        if (reqId !== reqIdRef.current || stoppedRef.current) return;

        setData(tables);
      } catch (e: any) {
        // ignore abort/cancel
        if (
          e?.name !== "CanceledError" &&
          e?.name !== "AbortError" &&
          e?.code !== "ERR_CANCELED"
        ) {
          // swallow non-fatal errors; tables should not break the UI
          // optionally log:
          // console.error(e);
        }
      } finally {
        // ✅ only the latest request schedules the next poll
        if (reqId === reqIdRef.current && !stoppedRef.current) {
          inFlightRef.current = false;

          // Add jitter so multiple clients don’t sync up
          const jitter = Math.floor(Math.random() * 5_000); // up to 5s
          timeoutRef.current = window.setTimeout(poll, pollMs + jitter);
        } else {
          // stale request finishing: don't touch timers / flags for the new one
        }
      }
    };

    // 🔥 when range changes: invalidate any in-flight response + hard reset + immediate fetch
    reqIdRef.current++; // ✅ instantly makes any in-flight response stale
    cancelRef.current?.abort();
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    inFlightRef.current = false;

    poll(); // ✅ immediate refetch

    return () => {
      stoppedRef.current = true;
      reqIdRef.current++; // ✅ invalidate anything still resolving
      cancelRef.current?.abort();
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [range, pollMs]);

  return data;
}