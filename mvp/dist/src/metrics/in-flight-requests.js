"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInFlightRequests = void 0;
const axios_1 = __importDefault(require("axios"));
const format_1 = require("../utils/format");
const getInFlightRequests = async ({ serviceName, tenant, start, end, step }) => {
    const promql = `
    sum(
      http_in_flight_requests{
        job="${serviceName}"
      }
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
    return (0, format_1.formatInFlight)(resp.data, { start, end, step });
};
exports.getInFlightRequests = getInFlightRequests;
