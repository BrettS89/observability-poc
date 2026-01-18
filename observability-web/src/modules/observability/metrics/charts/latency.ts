type Point = { t: number; v: number };

export function makeLatencyOption(args: {
  unit: string; // "ms"
  p50: Point[];
  p95: Point[];
}) {
  // Higher contrast + easier to tell apart on dark bg
  // Keep both solid (per your request)
  const p50Color = "rgb(148, 163, 184)"; // slate/neutral
  const p95Color = "rgb(249, 115, 22)";  // orange

  // ---- compute axis bounds (4 bands) ----
  const values = [...args.p50, ...args.p95]
    .map((p) => p.v)
    .filter(Number.isFinite) as number[];

  const maxV = values.length ? Math.max(...values) : 0;
  const bands = 4;

  const niceStep = (raw: number) => {
    if (!Number.isFinite(raw) || raw <= 0) return 1;
    const exp = Math.floor(Math.log10(raw));
    const base = raw / Math.pow(10, exp);
    const niceBase = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
    return niceBase * Math.pow(10, exp);
  };

  let interval = niceStep(maxV / bands || 1);
  let yMax = interval * bands;

  // If everything is 0 (or no data), give it a stable 0..4 so it doesn't look broken
  if (maxV <= 0) {
    interval = 1;
    yMax = 4;
  }

  const makeArea = (rgb: string, topAlpha: number) => ({
    color: {
      type: "linear",
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: rgbToRgba(rgb, .22) },
        // { offset: 1, color: rgbToRgba(rgb, 0) },
      ],
    },
  });

  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 52, right: 18, top: 26, bottom: 34 },

    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.92)",
      borderWidth: 0,
      textStyle: { color: "rgba(255,255,255,0.92)" },
      valueFormatter: (v: number) =>
        Number.isFinite(v) ? `${Math.round(v)} ${args.unit}` : "",
    },

    xAxis: {
      type: "time",
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.18)" } },
      axisTick: { show: false },
      axisLabel: { color: "rgba(255,255,255,0.55)", fontSize: 11 },
      splitLine: {
        show: true,
        lineStyle: {
          color: "rgba(255,255,255,0.1)",
          width: 1,
        },
      },
    },

    yAxis: {
      type: "value",
      min: 0,
      max: yMax,
      interval,
      splitNumber: bands,

      axisLine: { show: false },
      axisTick: { show: false },

      // integers for ms
      axisLabel: {
        color: "rgba(255,255,255,0.55)",
        fontSize: 11,
        margin: 10,
        formatter: (v: number) => (Number.isFinite(v) ? String(Math.round(v)) : ""),
      },

      splitLine: {
        show: true,
        lineStyle: { color: "rgba(255,255,255,0.1)" },
      },

      minorTick: { show: false },
      minorSplitLine: { show: false },
      scale: false,
    },

    legend: {
      top: 6,
      right: 12,
      itemGap: 14,
      itemWidth: 18,
      itemHeight: 3,
      textStyle: {
        color: "rgba(255,255,255,0.78)",
        fontSize: 11,
        fontWeight: 500,
      },
      formatter: (name: string) => {
        if (name === "p50") return "p50 (median)";
        if (name === "p95") return "p95 (tail)";
        return name;
      },
    },

    series: [
      {
        name: "p50",
        type: "line",
        smooth: false,
        connectNulls: false,
        showSymbol: false,
        sampling: "lttb",
        data: args.p50.map((p) => [p.t, p.v]),
        lineStyle: { width: 2, color: p50Color },
        itemStyle: { color: p50Color },
        areaStyle: makeArea(p50Color, 0.12),
      },
      {
        name: "p95",
        type: "line",
        smooth: false,
        connectNulls: false,
        showSymbol: false,
        sampling: "lttb",
        data: args.p95.map((p) => [p.t, p.v]),
        lineStyle: { width: 2, color: p95Color },
        itemStyle: { color: p95Color },
        areaStyle: makeArea(p95Color, 0.18),
      },
    ],
  };
}
function rgbToRgba(rgb: string, a: number) {
  // expects "rgb(r, g, b)"
  const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return `rgba(255,255,255,${a})`;
  const [, r, g, b] = m;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}