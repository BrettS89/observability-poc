"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorRate = void 0;
const axios_1 = __importDefault(require("axios"));
const format_1 = require("../utils/format");
const getErrorRate = async ({ serviceName, tenant, start, end, step }) => {
    const promql = `
    100 *
      sum(rate(http_requests_total{
        job="${serviceName}",
        status_class="5xx"
      }[30s]))
      /
      clamp_min(
        sum(rate(http_requests_total{
          job="${serviceName}"
        }[30s])),
        1e-9
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
    return (0, format_1.formatErrorRate)(resp.data, { start, end, step });
};
exports.getErrorRate = getErrorRate;
