import ReactECharts from 'echarts-for-react';
import { useEffect, useMemo, useState } from 'react';
import { useMetricsPoller } from '../../../hooks/use-metrics-poller';
import { styles } from './styles';
import { makeLatencyOption } from './charts/latency';
import { makeSingleSeriesOption2 } from './charts/in-flight-requests';
import { makeSingleSeriesOptionError } from './charts/error-rate';

type Point = { t: number; v: any };

export const Metrics = () => {
  const metrics = useMetricsPoller(); // returns null initially
  const [rpsPoints, setRpsPoints] = useState<Point[]>([]);
  const [p50Points, setP50Points] = useState<Point[]>([]);
  const [p95Points, setP95Points] = useState<Point[]>([]);
  const [inFlightPoints, setInFlightPoints] = useState<Point[]>([]);
  const [errorRatePoints, setErrorRatePoints] = useState<Point[]>([]);

  // ✅ Update rolling window AFTER render when new metrics arrive
  useEffect(() => {
    const next = metrics?.rps?.series?.[0]?.points;
    if (!next?.length) return;

    setRpsPoints(prev => mergeWindow(prev, next, 15 * 60_000));
  }, [metrics]);

  // ✅ Safe even when metrics is null
  const rpsOption = useMemo(() => {
    const unit = metrics?.rps?.unit ?? 'req/s';
    return makeSingleSeriesOption({
      title: 'Requests Per Second',
      unit,
      points: rpsPoints,
    });
  }, [metrics?.rps?.unit, rpsPoints]);


  useEffect(() => {
    const p50Next = metrics?.latency?.series?.find((s) => s.name === "p50")?.points ?? [];
    const p95Next = metrics?.latency?.series?.find((s) => s.name === "p95")?.points ?? [];
    if (!p50Next.length && !p95Next.length) return;

    if (p50Next.length) setP50Points((prev) => mergeWindow(prev, p50Next, 15 * 60_000));
    if (p95Next.length) setP95Points((prev) => mergeWindow(prev, p95Next, 15 * 60_000));
  }, [metrics]);

  const latencyOption = useMemo(() => {
    const unit = metrics?.latency?.unit ?? "ms";
    return makeLatencyOption({ unit, p50: p50Points, p95: p95Points });
  }, [metrics?.latency?.unit, p50Points, p95Points]);

  const errorRateOption = useMemo(() => {
    return makeSingleSeriesOptionError({
      title: "Error Rate",
      unit: "%",
      points: errorRatePoints,
      color: "rgb(244, 63, 94)", // rose/red
      minY: 0,
      decimals: 0,
    });
  }, [errorRatePoints]);

  useEffect(() => {
    const next = metrics?.inFlightRequests?.series?.[0]?.points;
    if (!next?.length) return;

    setInFlightPoints(prev => mergeWindow(prev, next, 15 * 60_000));
  }, [metrics]);

  useEffect(() => {
    const next = metrics?.errorRate?.series?.[0]?.points;
    if (!next?.length) return;

    setErrorRatePoints((prev) => mergeWindow(prev, next, 15 * 60_000));
  }, [metrics]);

  const inFlightOption = useMemo(() => {
    // const unit = metrics?.inFlightRequests?.unit ?? "req";
    return makeSingleSeriesOption2({
      title: "In-flight Requests",
      unit: "req",
      points: inFlightPoints,
      color: "rgb(251, 191, 36)", // amber
      minY: 0,
      decimals: 0,
    });
      }, [metrics?.inFlightRequests?.unit, inFlightPoints]);

  if (!metrics) {
    return <div>Loading...</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.charts}>
        <div style={styles.chartRow}>
          <div style={styles.chart}>
            <div style={styles.chartHeader}>
              <div style={styles.panelTitle}>Requests Per Second (req/s)</div>
            </div>

            <div style={styles.chartBody}>
              <ReactECharts
                option={rpsOption}
                style={{ width: '100%', height: '100%' }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
          </div>

          <div style={styles.chart}>
            <div style={styles.chartHeader}>
              <div style={styles.panelTitle}>Request Latency (ms)</div>
            </div>

            <div style={styles.chartBody}>
              <ReactECharts
                option={latencyOption}
                style={{ width: "100%", height: "100%" }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>

          </div>
        </div>

        <div style={styles.chartRow}>
          <div style={styles.chart}>
            <div style={styles.chartHeader}>
              <div style={styles.panelTitle}>In-Flight Requests (req)</div>
            </div>
            <div style={styles.chartBody}>
              <ReactECharts
                option={inFlightOption}
                style={{ width: "100%", height: "100%" }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
          </div>

          <div style={styles.chart}>
            <div style={styles.chartHeader}>
              <div style={styles.panelTitle}>Error Rate (%)</div>
            </div>

            <div style={styles.chartBody}>
              <ReactECharts
                option={errorRateOption}
                style={{ width: "100%", height: "100%" }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function makeSingleSeriesOption(args: {
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

function mergeWindow(prev: Point[], next: Point[], windowMs: number): Point[] {
  const map = new Map<number, number>();
  for (const p of prev) map.set(p.t, p.v);
  for (const p of next) map.set(p.t, p.v);

  const cutoff = Date.now() - windowMs;

  return Array.from(map.entries())
    .map(([t, v]) => ({ t, v }))
    .filter((p) => p.t >= cutoff)
    .sort((a, b) => a.t - b.t);
}