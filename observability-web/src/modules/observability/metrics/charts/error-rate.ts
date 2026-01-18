export function makeSingleSeriesOptionError(args: {
  title: string;
  unit: string; // "%"
  points: { t: number; v: number | null }[];
  color?: string;
  minY?: number; // should be 0
  decimals?: number; // tooltip precision
}) {
  const line = args.color ?? "rgb(244, 63, 94)"; // rose
  const decimals = args.decimals ?? 2;

  const formatTooltip = (n: number) => {
    if (!Number.isFinite(n)) return "";
    return n.toFixed(decimals);
  };

  const vals = args.points
    .map((p) => (p.v ?? NaN))
    .filter(Number.isFinite) as number[];

  const maxV = vals.length ? Math.max(...vals) : 0;
  const minY = args.minY ?? 0;

  const bands = 4;

  // ✅ choose a "nice" capped max that produces exactly 4 bands
  const candidates = [4, 10, 20, 25, 50, 100];
  const cappedMaxV = Math.min(Math.max(maxV, 0), 100);

  // smallest candidate >= maxV (fallback to 100)
  const yMax = candidates.find((c) => c >= cappedMaxV) ?? 100;
  const interval = yMax / bands; // => exact 4 bands, always

  const rgba = (rgb: string, a: number) => {
    if (rgb.startsWith("rgb(")) return rgb.replace("rgb(", "rgba(").replace(")", `, ${a})`);
    if (rgb.startsWith("rgba(")) return rgb.replace(/,\s*[\d.]+\)\s*$/, `, ${a})`);
    return `rgba(244, 63, 94, ${a})`;
  };

  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 52, right: 18, top: 26, bottom: 34 },

    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.92)",
      borderWidth: 0,
      textStyle: { color: "rgba(255,255,255,0.92)" },
      valueFormatter: (v: number) => `${formatTooltip(v)} ${args.unit}`,
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
      min: minY,
      max: yMax,         // ✅ capped + nice
      interval,          // ✅ exactly 4 bands

      splitNumber: bands,

      minorTick: { show: false },
      minorSplitLine: { show: false },

      axisLine: { show: false },
      axisTick: { show: false },

      // ✅ integers only
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

      // IMPORTANT: keep off when you set interval/max manually
      scale: false,
    },

    series: [
      {
        name: args.title,
        type: "line",
        showSymbol: false,
        smooth: false,
        data: args.points.map((p) => [p.t, p.v]),
        lineStyle: { width: 2, color: line },
        itemStyle: { color: line },

        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: rgba(line, 0.22) },
              // { offset: 1, color: rgba(line, 0.0) },
            ],
          },
        },

        emphasis: { focus: "series", lineStyle: { width: 3 } },
      },
    ],
  };
}