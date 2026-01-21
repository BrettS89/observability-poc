import axios from "axios";

const PROM_URL = "http://mimir:9009/prometheus/api/v1/query";

export async function get10WorstEndpointsByErrorRate({
  serviceName,
  tenant,
}: {
  serviceName: string;
  tenant: string;
}) {
  const headers = { "X-Scope-OrgID": tenant };

  // % error rate per endpoint (5xx / total) * 100
  // clamp_min prevents negative weirdness; clamp_max ensures it never exceeds 100
  // max(denom, 1e-9) avoids division-by-zero -> +Inf
  const errorRateQuery = `
    topk(
      10,
      clamp_max(
        100 *
          sum by (method, route) (
            rate(http_requests_total{job="${serviceName}",status_class="5xx"}[15m])
          )
          /
          clamp_min(
            sum by (method, route) (
              rate(http_requests_total{job="${serviceName}"}[15m])
            ),
            1e-9
          ),
        100
      ) > 0
    )
  `;

  // raw 5xx errors/sec (useful for context + for computing "errors" over window if you want later)
  const errorsPerSecQuery = `
    sum by (method, route) (
      rate(http_requests_total{job="${serviceName}",status_class="5xx"}[15m])
    )
  `;

  // requests/sec per endpoint
  const rpsQuery = `
    sum by (method, route) (
      rate(http_requests_total{job="${serviceName}"}[15m])
    )
  `;

  const [rateResp, errorsResp, rpsResp] = await Promise.all([
    axios.get<PromVectorResp>(PROM_URL, { params: { query: errorRateQuery }, headers }),
    axios.get<PromVectorResp>(PROM_URL, { params: { query: errorsPerSecQuery }, headers }),
    axios.get<PromVectorResp>(PROM_URL, { params: { query: rpsQuery }, headers }),
  ]);

  return formatTopEndpointsByErrorRate({
    errorRate: rateResp.data,
    errorsPerSec: errorsResp.data,
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

export function formatTopEndpointsByErrorRate({
  errorRate,
  errorsPerSec,
  rps,
}: {
  errorRate: PromVectorResp;
  errorsPerSec: PromVectorResp;
  rps: PromVectorResp;
}) {
  const rateRows = errorRate?.data?.result ?? [];
  const errRows = errorsPerSec?.data?.result ?? [];
  const rpsRows = rps?.data?.result ?? [];

  // ---- lookup maps ----

  const errorsMap = new Map<string, number>();
  for (const r of errRows) {
    const v = Number(r.value?.[1]);
    if (Number.isFinite(v)) {
      errorsMap.set(key(r.metric), Number(v.toFixed(2))); // errors/sec
    }
  }

  const rpsMap = new Map<string, number>();
  for (const r of rpsRows) {
    const v = Number(r.value?.[1]);
    if (Number.isFinite(v)) {
      rpsMap.set(key(r.metric), Number(v.toFixed(2)));
    }
  }

  // ---- final rows ranked by errorRate ----

  const rows = rateRows
    .map((r) => {
      const method = r.metric?.method ?? "UNKNOWN";
      const route = r.metric?.route ?? "unknown";
      const k = `${method} ${route}`;
      const v = Number(r.value?.[1]);
      if (!Number.isFinite(v)) return null;

      // clamp in code too (belt + suspenders)
      const clamped = Math.max(0, Math.min(100, v));

      return {
        endpoint: k,
        method,
        route,
        errorRate: Number(clamped.toFixed(1)), // percent
        errorsPerSec: errorsMap.get(k) ?? 0,   // errors/sec
        rps: rpsMap.get(k) ?? 0,               // req/sec
      };
    })
    .filter(Boolean) as Array<{
      endpoint: string;
      method: string;
      route: string;
      errorRate: number;     // %
      errorsPerSec: number;  // errors/sec
      rps: number;           // req/sec
    }>;

  const asOfSeconds = rateRows[0]?.value?.[0];
  const asOf = Number.isFinite(asOfSeconds)
    ? Math.round(asOfSeconds * 1000)
    : Date.now();

  return {
    unit: "%",
    asOf,
    rows,
  };
}
