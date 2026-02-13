"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tablesRouter = void 0;
const express_1 = require("express");
const _10_slowest_endpoints_1 = require("../metrics/10-slowest-endpoints");
const highest_error_endpoints_1 = require("../metrics/highest-error-endpoints");
const tablesRouter = (0, express_1.Router)();
exports.tablesRouter = tablesRouter;
tablesRouter.get('/tables', async (req, res) => {
    const range = (req.query.range ?? '15m');
    try {
        const [slowestEndpoints, highestErrorEndpoints] = await Promise.all([
            (0, _10_slowest_endpoints_1.get10SlowestEndpoints)({ serviceName: 'customer-api', tenant: 'test', range }),
            (0, highest_error_endpoints_1.get10WorstEndpointsByErrorRate)({ serviceName: 'customer-api', tenant: 'test', range }),
        ]);
        res.status(200).json({
            endpoint_latency: slowestEndpoints,
            endpoint_errors: highestErrorEndpoints,
        });
    }
    catch (e) {
        //@ts-ignore
        res.status(500).json({ error: e.message });
        console.log(e);
    }
});
