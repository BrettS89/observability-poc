import { useEffect, useMemo, useRef, useState } from "react";
import { getMetrics, type MetricsPayload } from "../api/calls";
import { mergeWindow } from "../modules/observability/metrics/utils";

type Range = "15m" | "1h" | "24h" | "7d";
type Point = { t: number; v: any };

const windowMsByRange: Record<Range, number> = {
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "24h": 24 * 60 * 60_000,
  "7d": 7 * 24 * 60 * 60_000,
};

// optional: if you want polling frequency to change with range
const pollMsByRange: Record<Range, number> = {
  "15m": 10_000,
  "1h": 15_000,
  "24h": 30_000,
  "7d": 60_000,
};

export function useMetricsPoller(range: Range) {
  const windowMs = useMemo(() => windowMsByRange[range], [range]);
  const pollMs = useMemo(() => pollMsByRange[range], [range]);

  const [rpsPoints, setRpsPoints] = useState<Point[]>([]);
  const [p50Points, setP50Points] = useState<Point[]>([]);
  const [p95Points, setP95Points] = useState<Point[]>([]);
  const [inFlightPoints, setInFlightPoints] = useState<Point[]>([]);
  const [errorRatePoints, setErrorRatePoints] = useState<Point[]>([]);
  const [data, setData] = useState<MetricsPayload | null>(null);

  const cancelRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;

    const poll = async () => {
      if (stoppedRef.current) return;

      // Pause polling in background tabs (optional)
      if (document.visibilityState !== "visible") {
        timeoutRef.current = window.setTimeout(poll, pollMs);
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
        // IMPORTANT: pass range to your API call (you said you'll handle the rest)
        const metrics = await getMetrics({ range, signal: controller.signal } as any);

        const nextRps = metrics?.rps?.series?.[0]?.points ?? [];
        if (nextRps.length) setRpsPoints((prev) => mergeWindow(prev, nextRps, windowMs));

        const p50Next =
          metrics?.latency?.series?.find((s) => s.name === "p50")?.points ?? [];
        const p95Next =
          metrics?.latency?.series?.find((s) => s.name === "p95")?.points ?? [];

        if (p50Next.length) setP50Points((prev) => mergeWindow(prev, p50Next, windowMs));
        if (p95Next.length) setP95Points((prev) => mergeWindow(prev, p95Next, windowMs));

        const nextInFlight = metrics?.inFlightRequests?.series?.[0]?.points ?? [];
        if (nextInFlight.length)
          setInFlightPoints((prev) => mergeWindow(prev, nextInFlight, windowMs));

        const nextErr = metrics?.errorRate?.series?.[0]?.points ?? [];
        if (nextErr.length)
          setErrorRatePoints((prev) => mergeWindow(prev, nextErr, windowMs));

        setData(metrics);
      } catch (e: any) {
        // ignore abort
        if (e?.name !== "CanceledError" && e?.name !== "AbortError") {
          // optionally log
          // console.error(e);
        }
      } finally {
        inFlightRef.current = false;

        const jitter = Math.floor(Math.random() * 2000);
        timeoutRef.current = window.setTimeout(poll, pollMs + jitter);
      }
    };

    // 🔥 when range changes: hard reset + immediate fetch
    cancelRef.current?.abort();
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    inFlightRef.current = false;

    setData(null);
    setRpsPoints([]);
    setP50Points([]);
    setP95Points([]);
    setInFlightPoints([]);
    setErrorRatePoints([]);

    poll(); // ✅ immediate refetch

    return () => {
      stoppedRef.current = true;
      cancelRef.current?.abort();
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [range, windowMs, pollMs]);

  return { data, rpsPoints, p50Points, p95Points, inFlightPoints, errorRatePoints };
}