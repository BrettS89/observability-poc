type Point = { t: number; v: number | null };

export const formatRps = (data: any, range: { start: number; end: number; step: number }) => {
  const series = data?.data?.result?.[0];

  const values: Array<[number, string]> = series?.values ?? [];

  const points = fillTimeGrid({
    start: range.start,
    end: range.end,
    step: range.step,
    points: values,
    defaultValue: 0,
  });

  return {
    unit: "req/s",
    series: [
      {
        name: "rps",
        points,
      },
    ],
  };
};

export const formatLatency = (
  data: any,
  range: { start: number; end: number; step: number }
) => {
  const result = data?.data?.result ?? [];

  return {
    unit: "ms",
    series: result.map((s: any) => {
      // If you’re querying with `quantile="0.5"` / `quantile="0.95"`
      // you can map it to friendly names:
      const q = s.metric?.quantile;
      const name =
        q === "0.5" ? "p50" :
        q === "0.95" ? "p95" :
        q ?? "unknown";

      const values: Array<[number, string]> = s?.values ?? [];

      const points: Point[] = fillTimeGrid({
        start: range.start,
        end: range.end,
        step: range.step,
        points: values,
      });

      return { name, points };
    }),
  };
};

export const formatInFlight = (
  data: any,
  range: { start: number; end: number; step: number }
) => {
  const series = data?.data?.result?.[0];

  if (!series) {
    return {
      unit: "requests",
      series: [],
    };
  }

  const values: Array<[number, string]> = series.values ?? [];

  const points: Point[] = fillTimeGrid({
    start: range.start,
    end: range.end,
    step: range.step,
    points: values,
    defaultValue: 0,
  });

  return {
    unit: "requests",
    series: [
      {
        name: "in_flight",
        points,
      },
    ],
  };
};

export const formatErrorRate = (data: any, range: { start: number; end: number; step: number }) => {
  const series = data?.data?.result?.[0];

  if (!series) {
    return {
      unit: "percent",
      series: [],
    };
  }

  const values: Array<[number, string]> = series.values ?? [];

  const points: Point[] = fillTimeGrid({
    start: range.start,
    end: range.end,
    step: range.step,
    points: values,
    defaultValue: 0,
  });

  return {
    unit: "percent",
    series: [
      {
        name: "error_rate",
        points,
      },
    ],
  };
};

function fillTimeGrid(args: {
  start: number; // unix seconds
  end: number;   // unix seconds
  step: number;  // seconds
  points: Array<[number, string]>; // [[unixSec, "value"], ...]
  defaultValue?: number | null;    // 👈 NEW (optional)
}): Point[] {
  let { start, end, step, points, defaultValue = null } = args;

  start = Math.floor(start);
  end = Math.floor(end);
  step = Math.floor(step);

  if (!Number.isFinite(step) || step <= 0) return [];

  const map = new Map<number, number>();
  for (const [tsSec, valStr] of points) {
    const v = Number(valStr);
    if (Number.isFinite(v)) {
      map.set(Math.floor(tsSec) * 1000, v);
    }
  }

  const out: Point[] = [];
  for (let t = start; t <= end; t += step) {
    const ms = t * 1000;
    out.push({
      t: ms,
      v: map.get(ms) ?? defaultValue,
    });
  }

  return out;
}