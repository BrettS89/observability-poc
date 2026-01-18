import { http } from './config';

type Point = { t: number; v: number };
type Series = { name: string; points: Point[] };
type MetricBlock = { unit: string; series: Series[] };

export type MetricsPayload = {
  rps: MetricBlock;
  latency: MetricBlock;
  inFlightRequests: MetricBlock;
  errorRate: MetricBlock;
};

export const getMetrics = async () => {
  const { data } = await http<MetricsPayload>({
    url: '/metrics',
    method: 'GET',
  });

  return data;
};
