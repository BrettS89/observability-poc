import axios from "axios";

const PROM_URL = "http://mimir:9009/prometheus/api/v1/query";

export async function get10SlowestEndpoints({
  serviceName,
  tenant,
}: {
  serviceName: string;
  tenant: string;
}) {
  const headers = { "X-Scope-OrgID": tenant };

  const p95Query = `
    topk(
      10,
      histogram_quantile(
        0.95,
        sum by (le, method, route) (
          rate(http_request_duration_ms_bucket{job="${serviceName}"}[15m])
        )
      )
    )
  `;

  const p50Query = `
    histogram_quantile(
      0.50,
      sum by (le, method, route) (
        rate(http_request_duration_ms_bucket{job="${serviceName}"}[15m])
      )
    )
  `;

  const rpsQuery = `
    sum by (method, route) (
      rate(http_requests_total{job="${serviceName}"}[15m])
    )
  `;

  const [p95Resp, p50Resp, rpsResp] = await Promise.all([
    axios.get<PromVectorResp>(PROM_URL, { params: { query: p95Query }, headers }),
    axios.get<PromVectorResp>(PROM_URL, { params: { query: p50Query }, headers }),
    axios.get<PromVectorResp>(PROM_URL, { params: { query: rpsQuery }, headers }),
  ]);

  return formatTopEndpoints({
    p95: p95Resp.data,
    p50: p50Resp.data,
    rps: rpsResp.data,
  });
}

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

  // ---- Build lookup maps ----

  const p50Map = new Map<string, number>();
  for (const r of p50Rows) {
    const v = Number(r.value?.[1]);
    if (Number.isFinite(v)) {
      p50Map.set(key(r.metric), Math.round(v));
    }
  }

  const rpsMap = new Map<string, number>();
  for (const r of rpsRows) {
    const v = Number(r.value?.[1]);
    if (Number.isFinite(v)) {
      rpsMap.set(key(r.metric), Number(v.toFixed(2)));
    }
  }

  // ---- Build final rows (ranked by p95) ----

  const rows = p95Rows
    .map((r) => {
      const method = r.metric?.method ?? "UNKNOWN";
      const route = r.metric?.route ?? "unknown";
      const k = `${method} ${route}`;
      const p95v = Number(r.value?.[1]);

      if (!Number.isFinite(p95v)) return null;

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
  const asOf = Number.isFinite(asOfSeconds)
    ? Math.round(asOfSeconds * 1000)
    : Date.now();

  return {
    unit: "ms",
    asOf,
    rows,
  };
}