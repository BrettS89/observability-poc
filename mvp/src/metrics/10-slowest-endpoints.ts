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

function rangeToSeconds(range: string): number {
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
  range,
}: {
  serviceName: string;
  tenant: string;
  range: string;
}) {
  const headers = { "X-Scope-OrgID": tenant };
  const rangeSeconds = rangeToSeconds(range);

  const bucket = `http_request_duration_ms_milliseconds_bucket`;

  // ✅ clamp_min prevents negative increases after restarts/resets
  const p95Query = `
    topk(
      10,
      histogram_quantile(
        0.95,
        sum by (le, method, route) (
          clamp_min(increase(${bucket}{job="${serviceName}"}[${range}]), 0)
        )
      )
    )
  `;

  const p50Query = `
    histogram_quantile(
      0.50,
      sum by (le, method, route) (
        clamp_min(increase(${bucket}{job="${serviceName}"}[${range}]), 0)
      )
    )
  `;

  // ✅ requests in window
  const reqsQuery = `
    sum by (method, route) (
      clamp_min(increase(http_requests_total{job="${serviceName}"}[${range}]), 0)
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
    rangeSeconds,
  });
}

export function formatTopEndpoints({
  p95,
  p50,
  reqs,
  rangeSeconds,
}: {
  p95: PromVectorResp;
  p50: PromVectorResp;
  reqs: PromVectorResp;
  rangeSeconds: number;
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
    if (v != null) reqMap.set(key(r.metric), Math.round(v));
  }

  const rows = p95Rows
    .map((r) => {
      const k = key(r.metric);
      const p95v = toNumber(r.value?.[1]);
      if (p95v == null) return null;

      const method = r.metric?.method ?? "UNKNOWN";
      const route = r.metric?.route ?? "unknown";

      const requests = reqMap.get(k) ?? 0;
      const rpsAvg = requests / rangeSeconds;

      return {
        endpoint: k,
        method,
        route,
        p95: Math.round(p95v),
        p50: p50Map.get(k) ?? null,

        // ✅ new fields
        requests,
        rpsAvg: Number(rpsAvg.toFixed(4)),

        // ✅ backward-compat: keep whatever your UI expects today.
        // If your column label still says "RPS" but you want to show requests, keep this:
        rps: requests,
        // If instead you want actual avg rps, swap to:
        // rps: Number(rpsAvg.toFixed(4)),
      };
    })
    .filter(Boolean) as Array<{
      endpoint: string;
      method: string;
      route: string;
      p95: number;
      p50: number | null;
      requests: number;
      rpsAvg: number;
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