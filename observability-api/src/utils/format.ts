export const formatRps = (data: any) => {
  const series = data?.data?.result?.[0];

  if (!series) {
    return {
      unit: "req/s",
      series: [],
    };
  }

  return {
    unit: "req/s",
    series: [
      {
        name: "rps",
        points: series.values.map(([ts, v]: [number, string]) => {
          const num = Number(v);
          return {
            t: ts * 1000,
            v: Number.isFinite(num) ? num : null,
          };
        }),
      },
    ],
  };
};

export const formatLatency = (data: any) => {
  const result = data?.data?.result ?? [];

  return {
    unit: "ms",
    series: result.map((series: any) => {
      const quantile = series.metric?.quantile ?? "unknown";

      return {
        name: quantile,
        points: series.values.map(([ts, v]: [number, string]) => {
          const num = Number(v);
          return {
            t: ts * 1000,
            v: Number.isFinite(num) ? num : null,
          };
        }),
      };
    }),
  };
};
