"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsIngestRouter = void 0;
const environment_variables_1 = require("../config/environment-variables");
const http_client_1 = require("../http-client");
const express_1 = require("express");
const router = (0, express_1.Router)();
exports.metricsIngestRouter = router;
router.post('/otlp/v1/metrics', async (req, res) => {
    try {
        const tenant = req.headers['X-Scope-OrgID'];
        if (!tenant)
            return res.status(401).send('unauthorized');
        const upstreamHeaders = {
            'content-type': req.header('content-type') ?? 'application/json',
            ...(req.header('content-encoding') ? { 'content-encoding': req.header('content-encoding') } : {}),
            'X-Scope-OrgID': tenant,
            Authorization: environment_variables_1.envVars.CLOUD_METRICS_TOKEN,
        };
        const mimirClient = (0, http_client_1.createHttpClient)({
            name: 'otlp-metrics-client',
            baseURL: environment_variables_1.envVars.CLOUD_METRICS_URL,
            timeoutMs: 2000,
            retries: 0,
        });
        const resp = await mimirClient.request.post('/otlp/v1/metrics', req.body, { headers: upstreamHeaders });
        const text = await resp.data;
        res.status(resp.status).send(text);
    }
    catch (err) {
        console.log(err);
        res.status(502).send(`upstream error: ${err?.message ?? String(err)}`);
    }
});
