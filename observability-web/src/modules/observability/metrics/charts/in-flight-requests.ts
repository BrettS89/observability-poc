export function makeSingleSeriesOption2(args: {
  title: string;
  unit: string;
  points: { t: number; v: number | null }[];
  color?: string;            // allow per-metric color
  minY?: number;             // allow overriding min (in-flight should be 0)
  decimals?: number;         // control tooltip precision
}) {
  // ✅ match the RPS color from your screenshot by default
  const line = args.color ?? "rgb(229, 179, 91)"; // #E5B35B
  const decimals = args.decimals ?? 3;

  const formatValue = (n: number) => {
    if (!Number.isFinite(n)) return "";
    if (Math.abs(n) >= 100) return n.toFixed(0);
    if (Math.abs(n) >= 10) return n.toFixed(1);
    if (Math.abs(n) >= 1) return n.toFixed(2);
    return n.toFixed(decimals);
  };

  // ---- y-axis "4 bands" locking ----
  const vals = args.points.map((p) => (p.v ?? NaN)).filter(Number.isFinite) as number[];
  const maxV = vals.length ? Math.max(...vals) : 0;
  const minY = args.minY ?? 0;

  const bands = 4;

  // For in-flight: keep a stable 0..4 axis unless reality exceeds it
  const useFixedLowRange = minY === 0 && args.unit.toLowerCase().includes("req");
  const fixedMax = 4;

  const niceStep = (raw: number) => {
    if (!Number.isFinite(raw) || raw <= 0) return 1;
    const exp = Math.floor(Math.log10(raw));
    const base = raw / Math.pow(10, exp);
    const niceBase = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
    return niceBase * Math.pow(10, exp);
  };

  let interval: number;
  let yMax: number;

  if (useFixedLowRange && maxV <= fixedMax) {
    interval = 1;
    yMax = fixedMax;
  } else {
    interval = niceStep((maxV - minY) / bands || 1);
    yMax = minY + interval * bands;

    if (maxV <= minY) {
      interval = 1;
      yMax = minY + fixedMax;
    }
  }

  // ---- rgb()/rgba() helper ----
  const rgba = (rgb: string, a: number) => {
    if (rgb.startsWith("rgb(")) return rgb.replace("rgb(", "rgba(").replace(")", `, ${a})`);
    if (rgb.startsWith("rgba(")) return rgb.replace(/,\s*[\d.]+\)\s*$/, `, ${a})`);
    return `rgba(229, 179, 91, ${a})`; // fallback
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
      valueFormatter: (v: number) => `${formatValue(v)} ${args.unit}`,
    },

    xAxis: {
      type: "time",
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.18)" } },
      axisTick: { show: false },
      axisLabel: { color: "rgba(255,255,255,0.55)", fontSize: 11 },

      // ✅ vertical grid lines (like your mockup)
      splitLine: {
        show: true,
        lineStyle: { color: "rgba(255,255,255,0.10)", width: 1 },
      },
    },

    yAxis: {
      type: "value",
      min: minY,
      max: yMax,
      interval,
      splitNumber: bands,

      minorTick: { show: false },
      minorSplitLine: { show: false },

      axisLine: { show: false },
      axisTick: { show: false },

      axisLabel: {
        color: "rgba(255,255,255,0.55)",
        fontSize: 11,
        margin: 10,
        formatter: (v: number) => {
          if (!Number.isFinite(v)) return "";
          if (useFixedLowRange) return String(Math.round(v));
          return formatValue(v);
        },
      },

      splitLine: {
        show: true,
        lineStyle: { color: "rgba(255,255,255,0.10)" },
      },

      scale: false,
    },

    series: [
      {
        name: args.title,
        type: "line",
        showSymbol: false,
        smooth: false,
        data: args.points.map((p) => [p.t, p.v]),

        // ✅ match mockup: thinner line
        lineStyle: { width: 2, color: line },
        itemStyle: { color: line },

        // ✅ NO GRADIENT: flat fill under line
        areaStyle: {
          color: rgba(line, 0.22), // tweak 0.18–0.28 to taste
        },

        emphasis: {
          focus: "series",
          lineStyle: { width: 3 },
        },
      },
    ],
  };
}