import axios from "axios";
import { envVars } from "../config/environment-variables";
import { promAuth } from "../config/grafana-auth";

const PROM_URL = `${envVars.CLOUD_PROMETHEUS_URL}/api/prom/api/v1/query`;

type PromVectorResp = {
  status: string;
  data?: {
    resultType: "vector";
    result: Array<{
      metric: Record<string, string>;
      value: [number, string]; // [unixSeconds, "value"]
    }>;
  };
};

function key(metric: Record<string, string>) {
  return `${metric.method ?? "UNKNOWN"} ${metric.route ?? "unknown"}`;
}

function toNumber(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function formatCount(n: number): number {
  // Keep it numeric for sorting; format for display in UI if you prefer.
  // If you want compact strings (1.2k), do that in the frontend.
  return Math.round(n);
}

async function instantQuery(query: string, headers: Record<string, string>) {
  const nowSec = Math.floor(Date.now() / 1000);
  return axios.get<PromVectorResp>(PROM_URL, {
    params: { query, time: nowSec },
    headers,
    auth: promAuth,
  });
}

export async function get10SlowestEndpoints({
  serviceName,
  tenant,
  range, // "5m" | "15m" | "1h" etc
}: {
  serviceName: string;
  tenant: string;
  range: string;
}) {
  const headers = { "X-Scope-OrgID": tenant };

  const bucket = `http_request_duration_ms_milliseconds_bucket`;

  const p95Query = `
    topk(
      10,
      histogram_quantile(
        0.95,
        sum by (le, method, route) (
          increase(${bucket}{job="${serviceName}"}[${range}])
        )
      )
    )
  `;

  const p50Query = `
    histogram_quantile(
      0.50,
      sum by (le, method, route) (
        increase(${bucket}{job="${serviceName}"}[${range}])
      )
    )
  `;

  // ✅ Total requests in the selected window (not averaged per second)
  const reqsQuery = `
    sum by (method, route) (
      increase(http_requests_total{job="${serviceName}"}[${range}])
    )
  `;

  const [p95Resp, p50Resp, reqsResp] = await Promise.all([
    instantQuery(p95Query, headers),
    instantQuery(p50Query, headers),
    instantQuery(reqsQuery, headers),
  ]);

  return formatTopEndpoints({
    p95: p95Resp.data,
    p50: p50Resp.data,
    reqs: reqsResp.data,
    window: range,
  });
}

export function formatTopEndpoints({
  p95,
  p50,
  reqs,
  window,
}: {
  p95: PromVectorResp;
  p50: PromVectorResp;
  reqs: PromVectorResp;
  window: string;
}) {
  const p95Rows = p95?.data?.result ?? [];
  const p50Rows = p50?.data?.result ?? [];
  const reqRows = reqs?.data?.result ?? [];

  const p50Map = new Map<string, number>();
  for (const r of p50Rows) {
    const v = toNumber(r.value?.[1]);
    if (v != null) p50Map.set(key(r.metric), Math.round(v));
  }

  const reqMap = new Map<string, number>();
  for (const r of reqRows) {
    const v = toNumber(r.value?.[1]);
    if (v != null) reqMap.set(key(r.metric), formatCount(v));
  }

  const rows = p95Rows
    .map((r) => {
      const k = key(r.metric);
      const p95v = toNumber(r.value?.[1]);
      if (p95v == null) return null;

      const method = r.metric?.method ?? "UNKNOWN";
      const route = r.metric?.route ?? "unknown";

      return {
        endpoint: k,
        method,
        route,
        p95: Math.round(p95v),
        p50: p50Map.get(k) ?? null,
        // ✅ requests in window
        requests: reqMap.get(k) ?? 0,
      };
    })
    .filter(Boolean) as Array<{
      endpoint: string;
      method: string;
      route: string;
      p95: number;
      p50: number | null;
      requests: number;
    }>;

  const asOfSeconds = p95Rows[0]?.value?.[0];
  const asOf =
    Number.isFinite(asOfSeconds) ? Math.round(Number(asOfSeconds) * 1000) : Date.now();

  return {
    unit: "ms",
    asOf,
    window, // e.g. "15m" so UI can label "Requests (last 15m)"
    rows,
  };
}