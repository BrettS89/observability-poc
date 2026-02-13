"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get10WorstEndpointsByErrorRate = get10WorstEndpointsByErrorRate;
exports.formatTopEndpointsByErrorRate = formatTopEndpointsByErrorRate;
const axios_1 = __importDefault(require("axios"));
const PROM_URL = "http://mimir:9009/prometheus/api/v1/query";
async function get10WorstEndpointsByErrorRate({ serviceName, tenant, range, }) {
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
            rate(http_requests_total{job="${serviceName}",status_class="5xx"}[${range}])
          )
          /
          clamp_min(
            sum by (method, route) (
              rate(http_requests_total{job="${serviceName}"}[${range}])
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
      rate(http_requests_total{job="${serviceName}",status_class="5xx"}[${range}])
    )
  `;
    // requests/sec per endpoint
    const rpsQuery = `
    sum by (method, route) (
      rate(http_requests_total{job="${serviceName}"}[${range}])
    )
  `;
    const [rateResp, errorsResp, rpsResp] = await Promise.all([
        axios_1.default.get(PROM_URL, { params: { query: errorRateQuery }, headers }),
        axios_1.default.get(PROM_URL, { params: { query: errorsPerSecQuery }, headers }),
        axios_1.default.get(PROM_URL, { params: { query: rpsQuery }, headers }),
    ]);
    return formatTopEndpointsByErrorRate({
        errorRate: rateResp.data,
        errorsPerSec: errorsResp.data,
        rps: rpsResp.data,
    });
}
function key(metric) {
    return `${metric.method ?? "UNKNOWN"} ${metric.route ?? "unknown"}`;
}
function formatTopEndpointsByErrorRate({ errorRate, errorsPerSec, rps, }) {
    const rateRows = errorRate?.data?.result ?? [];
    const errRows = errorsPerSec?.data?.result ?? [];
    const rpsRows = rps?.data?.result ?? [];
    // ---- lookup maps ----
    const errorsMap = new Map();
    for (const r of errRows) {
        const v = Number(r.value?.[1]);
        if (Number.isFinite(v)) {
            errorsMap.set(key(r.metric), Number(v.toFixed(2))); // errors/sec
        }
    }
    const rpsMap = new Map();
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
        if (!Number.isFinite(v))
            return null;
        // clamp in code too (belt + suspenders)
        const clamped = Math.max(0, Math.min(100, v));
        return {
            endpoint: k,
            method,
            route,
            errorRate: Number(clamped.toFixed(1)), // percent
            errorsPerSec: errorsMap.get(k) ?? 0, // errors/sec
            rps: rpsMap.get(k) ?? 0, // req/sec
        };
    })
        .filter(Boolean);
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
