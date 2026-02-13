"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatency = void 0;
const axios_1 = __importDefault(require("axios"));
const format_1 = require("../utils/format");
const getLatency = async ({ serviceName, tenant, start, end, step }) => {
    const promql = `
    label_replace(
    histogram_quantile(
      0.50,
      sum by (le) (
        rate(http_request_duration_ms_bucket{job="${serviceName}"}[30s])
      )
    ),
    "quantile", "p50", "__name__", ".*"
    )
    or
    label_replace(
      histogram_quantile(
        0.95,
        sum by (le) (
          rate(http_request_duration_ms_bucket{job="${serviceName}"}[30s])
        )
      ),
      "quantile", "p95", "__name__", ".*"
    )
  `;
    const resp = await axios_1.default.get("http://mimir:9009/prometheus/api/v1/query_range", {
        params: {
            query: promql,
            start,
            end,
            step,
        },
        headers: {
            "X-Scope-OrgID": tenant,
        },
    });
    return (0, format_1.formatLatency)(resp.data, { start, end, step });
};
exports.getLatency = getLatency;
