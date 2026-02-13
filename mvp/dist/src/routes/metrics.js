"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsRouter = void 0;
const express_1 = require("express");
const rps_1 = require("../metrics/rps");
const latency_1 = require("../metrics/latency");
const in_flight_requests_1 = require("../metrics/in-flight-requests");
const error_rate_1 = require("../metrics/error-rate");
const rangeMap = {
    '15m': { rangeSec: 15 * 60, stepSec: 15 }, // high-fidelity, live debugging
    '1h': { rangeSec: 60 * 60, stepSec: 30 }, // short-term investigation
    '24h': { rangeSec: 24 * 60 * 60, stepSec: 120 }, // daily patterns (2m)
    '7d': { rangeSec: 7 * 24 * 60 * 60, stepSec: 900 }, // weekly trends (15m)
};
const metricsRouter = (0, express_1.Router)();
exports.metricsRouter = metricsRouter;
metricsRouter.get('/metrics', async (req, res) => {
    const tenant = req.query.tenant;
    const serviceName = req.query.service;
    const rangeKey = req.query.range ?? '15m';
    const cfg = rangeMap[rangeKey] ?? rangeMap['15m'];
    const step = cfg.stepSec;
    const end = Math.floor(Date.now() / 1000 / step) * step;
    const start = end - cfg.rangeSec;
    const [rps, latency, inFlight, errorRate] = await Promise.all([
        (0, rps_1.getRps)({ serviceName, tenant, start, end, step }),
        (0, latency_1.getLatency)({ serviceName, tenant, start, end, step }),
        (0, in_flight_requests_1.getInFlightRequests)({ serviceName, tenant, start, end, step }),
        (0, error_rate_1.getErrorRate)({ serviceName, tenant, start, end, step }),
    ]);
    res.status(200).json({ rps, latency, inFlightRequests: inFlight, errorRate });
});
