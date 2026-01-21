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

export type TablesPayload = {
   endpoint_latency: {
    unit: string;
    asOf: number;
    rows: {
      method: string;
      route: string;
      endpoint: string;
      p95: number;
      p50: number;
      rps: number;
    }[];
  };
  endpoint_errors: {
    unit: string;
    asOf: number;
    rows: {
      method: string;
      route: string;
      endpoint: string;
      errorRate: number;
      errorsPerSec: number;
      rps: number;
    }[];
  };
};

export const getMetrics = async ({ range, signal }: { range: string, signal: any }) => {
  const { data } = await http<MetricsPayload>({
    url: '/metrics',
    method: 'GET',
    params: {
      range,
    },
    signal,
  });

  return data;
};

export const getTables = async () => {
  const { data } = await http<TablesPayload>({
    url: '/tables',
    method: 'GET',
  });

  return data;
};
