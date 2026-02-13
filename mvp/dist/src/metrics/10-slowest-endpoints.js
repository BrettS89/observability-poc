"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get10SlowestEndpoints = get10SlowestEndpoints;
exports.formatTopEndpoints = formatTopEndpoints;
const axios_1 = __importDefault(require("axios"));
const PROM_URL = "http://mimir:9009/prometheus/api/v1/query";
async function get10SlowestEndpoints({ serviceName, tenant, range, }) {
    const headers = { "X-Scope-OrgID": tenant };
    const p95Query = `
    topk(
      10,
      histogram_quantile(
        0.95,
        sum by (le, method, route) (
          rate(http_request_duration_ms_bucket{job="${serviceName}"}[${range}])
        )
      )
    )
  `;
    const p50Query = `
    histogram_quantile(
      0.50,
      sum by (le, method, route) (
        rate(http_request_duration_ms_bucket{job="${serviceName}"}[${range}])
      )
    )
  `;
    const rpsQuery = `
    sum by (method, route) (
      rate(http_requests_total{job="${serviceName}"}[${range}])
    )
  `;
    const [p95Resp, p50Resp, rpsResp] = await Promise.all([
        axios_1.default.get(PROM_URL, { params: { query: p95Query }, headers }),
        axios_1.default.get(PROM_URL, { params: { query: p50Query }, headers }),
        axios_1.default.get(PROM_URL, { params: { query: rpsQuery }, headers }),
    ]);
    return formatTopEndpoints({
        p95: p95Resp.data,
        p50: p50Resp.data,
        rps: rpsResp.data,
    });
}
function key(metric) {
    return `${metric.method ?? "UNKNOWN"} ${metric.route ?? "unknown"}`;
}
function formatTopEndpoints({ p95, p50, rps, }) {
    const p95Rows = p95?.data?.result ?? [];
    const p50Rows = p50?.data?.result ?? [];
    const rpsRows = rps?.data?.result ?? [];
    // ---- Build lookup maps ----
    const p50Map = new Map();
    for (const r of p50Rows) {
        const v = Number(r.value?.[1]);
        if (Number.isFinite(v)) {
            p50Map.set(key(r.metric), Math.round(v));
        }
    }
    const rpsMap = new Map();
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
        if (!Number.isFinite(p95v))
            return null;
        return {
            endpoint: k,
            method,
            route,
            p95: Math.round(p95v),
            p50: p50Map.get(k) ?? null,
            rps: rpsMap.get(k) ?? 0,
        };
    })
        .filter(Boolean);
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
