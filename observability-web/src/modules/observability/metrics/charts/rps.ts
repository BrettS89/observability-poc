export function makeRpsOptions(args: {
  title: string;
  unit: string;
  points: { t: number; v: number }[];
}) {
  const line = "rgb(99, 102, 241)";

  const maxV =
    args.points.length > 0
      ? Math.max(...args.points.map((p) => (Number.isFinite(p.v) ? p.v : 0)))
      : 0;

  // We want 4 horizontal bands => 5 ticks (0..max)
  const bands = 4;

  // "nice" step sizing (1, 2, 5 * 10^n)
  const niceStep = (raw: number) => {
    if (raw <= 0) return 1;
    const exp = Math.floor(Math.log10(raw));
    const base = raw / Math.pow(10, exp);
    const niceBase = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
    return niceBase * Math.pow(10, exp);
  };

  const interval = niceStep(maxV / bands || 1);
  const yMax = interval * bands;

  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 52, right: 18, top: 26, bottom: 34 },

    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.92)",
      borderWidth: 0,
      textStyle: { color: "rgba(255,255,255,0.92)" },
      valueFormatter: (v: number) => `${v.toFixed(3)} ${args.unit}`,
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

      // ✅ lock gridlines
      max: yMax,
      interval,

      // ✅ prevent extra faint lines
      minorTick: { show: false },
      minorSplitLine: { show: false },

      axisLine: { show: false },
      axisTick: { show: false },

      axisLabel: {
        color: "rgba(255,255,255,0.55)",
        fontSize: 11,
        margin: 10,
        formatter: (value: number) => {
          if (!Number.isFinite(value)) return "";
          if (value === 0) return "0";
          return value < 1 ? value.toFixed(2) : value.toFixed(1);
        },
      },

      splitLine: {
        show: true,
        lineStyle: { color: "rgba(255,255,255,0.1)" },
      },

      // IMPORTANT: scale=true makes ECharts “nice” ticks on its own (more lines)
      // ✅ turn it off when you're manually controlling interval/max
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
              { offset: 0, color: "rgba(99, 102, 241, 0.22)" },
              // { offset: 1, color: "rgba(99, 102, 241, 0.00)" },
            ],
          },
        },
        emphasis: { focus: "series", lineStyle: { width: 4 } },
      },
    ],
  };
}