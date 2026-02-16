import axios from "axios";
import { envVars } from "../config/environment-variables";
import { promAuth } from "../config/grafana-auth";

const PROM_RANGE_URL = `${envVars.CLOUD_PROMETHEUS_URL}/api/prom/api/v1/query_range`;

export async function get10SlowestEndpoints({
  serviceName,
  tenant,
  range,
}: {
  serviceName: string;
  tenant: string;
  range: string; // "5m" | "15m" | "1h"
}) {
  const headers = { "X-Scope-OrgID": tenant };

  const now = Math.floor(Date.now() / 1000);

  const rangeSeconds = parseRange(range);
  const start = now - rangeSeconds;

  // 1 datapoint every 30s is perfect for tables
  const step = 30;

  const p95Query = `
    topk(
      10,
      histogram_quantile(
        0.95,
        sum by (le, method, route) (
          rate(http_request_duration_ms_milliseconds_bucket{job="${serviceName}"}[${range}])
        )
      )
    )
  `;

  const p50Query = `
    histogram_quantile(
      0.50,
      sum by (le, method, route) (
        rate(http_request_duration_ms_milliseconds_bucket{job="${serviceName}"}[${range}])
      )
    )
  `;

  const rpsQuery = `
    sum by (method, route) (
      rate(http_requests_total{job="${serviceName}"}[${range}])
    )
  `;

  const params = {
    start,
    end: now,
    step,
  };

  const [p95Resp, p50Resp, rpsResp] = await Promise.all([
    axios.get(PROM_RANGE_URL, {
      params: { ...params, query: p95Query },
      headers,
      auth: promAuth,
    }),
    axios.get(PROM_RANGE_URL, {
      params: { ...params, query: p50Query },
      headers,
      auth: promAuth,
    }),
    axios.get(PROM_RANGE_URL, {
      params: { ...params, query: rpsQuery },
      headers,
      auth: promAuth,
    }),
  ]);

  return formatTopEndpoints({
    p95: p95Resp.data,
    p50: p50Resp.data,
    rps: rpsResp.data,
  });
}

function parseRange(r: string): number {
  if (r.endsWith("m")) return Number(r.slice(0, -1)) * 60;
  if (r.endsWith("h")) return Number(r.slice(0, -1)) * 3600;
  return 300;
}

type PromMatrixResp = {
  status: string;
  data?: {
    resultType: "matrix";
    result: Array<{
      metric: Record<string, string>;
      values: Array<[number, string]>;
    }>;
  };
};

function latestValue(values: Array<[number, string]>): number | null {
  if (!values?.length) return null;

  const v = Number(values[values.length - 1][1]);
  return Number.isFinite(v) ? v : null;
}

function key(metric: Record<string, string>) {
  return `${metric.method ?? "UNKNOWN"} ${metric.route ?? "unknown"}`;
}

export function formatTopEndpoints({
  p95,
  p50,
  rps,
}: {
  p95: PromMatrixResp;
  p50: PromMatrixResp;
  rps: PromMatrixResp;
}) {
  const p95Rows = p95?.data?.result ?? [];
  const p50Rows = p50?.data?.result ?? [];
  const rpsRows = rps?.data?.result ?? [];

  const p50Map = new Map<string, number>();
  const rpsMap = new Map<string, number>();

  for (const r of p50Rows) {
    const v = latestValue(r.values);
    if (v != null) p50Map.set(key(r.metric), Math.round(v));
  }

  for (const r of rpsRows) {
    const v = latestValue(r.values);
    if (v != null) rpsMap.set(key(r.metric), Number(v.toFixed(2)));
  }

  const rows = p95Rows
    .map((r) => {
      const method = r.metric?.method ?? "UNKNOWN";
      const route = r.metric?.route ?? "unknown";
      const k = `${method} ${route}`;

      const p95v = latestValue(r.values);
      if (p95v == null) return null;

      return {
        endpoint: k,
        method,
        route,
        p95: Math.round(p95v),
        p50: p50Map.get(k) ?? null,
        rps: rpsMap.get(k) ?? 0,
      };
    })
    .filter(Boolean) as Array<{
      endpoint: string;
      method: string;
      route: string;
      p95: number;
      p50: number | null;
      rps: number;
    }>;

  const asOf =
    p95Rows[0]?.values?.slice(-1)?.[0]?.[0] != null
      ? Math.round(p95Rows[0].values.slice(-1)[0][0] * 1000)
      : Date.now();

  return {
    unit: "ms",
    asOf,
    rows,
  };
}