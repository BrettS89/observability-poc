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

type Point = { t: number; v: number };

function key(metric: Record<string, string>) {
  return `${metric.method ?? "UNKNOWN"} ${metric.route ?? "unknown"}`;
}

function rangeToSeconds(range: string): number {
  // supports: 30s, 5m, 15m, 1h, 24h, 7d
  const m = /^(\d+)\s*([smhd])$/.exec(range.trim());
  if (!m) throw new Error(`Invalid range: "${range}" (expected like "15m", "1h")`);
  const n = Number(m[1]);
  const unit = m[2];
  const mult =
    unit === "s" ? 1 :
    unit === "m" ? 60 :
    unit === "h" ? 3600 :
    unit === "d" ? 86400 :
    1;
  return n * mult;
}

function toNumber(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

async function instantQuery(query: string, headers: Record<string, string>) {
  // IMPORTANT: /api/v1/query "time" is unix seconds (NOT ms)
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
  const rangeSeconds = rangeToSeconds(range);

  // NOTE: Grafana Cloud is exposing your histogram as:
  // http_request_duration_ms_milliseconds_bucket/_sum/_count
  const bucket = `http_request_duration_ms_milliseconds_bucket`;

  // Use increase() for table stats so they represent the whole window (not "right now")
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

  // Average RPS over the whole window (so it won't show 0.0 if traffic happened earlier)
  const rpsQuery = `
    sum by (method, route) (
      increase(http_requests_total{job="${serviceName}"}[${range}])
    ) / ${rangeSeconds}
  `;

  const [p95Resp, p50Resp, rpsResp] = await Promise.all([
    instantQuery(p95Query, headers),
    instantQuery(p50Query, headers),
    instantQuery(rpsQuery, headers),
  ]);

  return formatTopEndpoints({
    p95: p95Resp.data,
    p50: p50Resp.data,
    rps: rpsResp.data,
  });
}

export function formatTopEndpoints({
  p95,
  p50,
  rps,
}: {
  p95: PromVectorResp;
  p50: PromVectorResp;
  rps: PromVectorResp;
}) {
  const p95Rows = p95?.data?.result ?? [];
  const p50Rows = p50?.data?.result ?? [];
  const rpsRows = rps?.data?.result ?? [];

  const p50Map = new Map<string, number>();
  for (const r of p50Rows) {
    const v = toNumber(r.value?.[1]);
    if (v != null) p50Map.set(key(r.metric), Math.round(v));
  }

  const rpsMap = new Map<string, number>();
  for (const r of rpsRows) {
    const v = toNumber(r.value?.[1]);
    if (v != null) rpsMap.set(key(r.metric), Number(v.toFixed(2)));
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

  const asOfSeconds = p95Rows[0]?.value?.[0];
  const asOf =
    Number.isFinite(asOfSeconds) ? Math.round(Number(asOfSeconds) * 1000) : Date.now();

  return {
    unit: "ms",
    asOf,
    rows,
  };
}