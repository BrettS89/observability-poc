import { envVars } from '../config/environment-variables';
import { createHttpClient } from '../http-client';
import { Router } from 'express';

const router = Router();

router.post('/otlp/v1/metrics', async (req, res) => {
  try {
    const tenant = req.headers['X-Scope-OrgID'] || req.headers['x-scope-orgid'] as string;

    if (!tenant) return res.status(401).send('unauthorized');

    const upstreamHeaders: Record<string, string> = {
      'content-type': req.header('content-type') ?? 'application/json',
      ...(req.header('content-encoding') ? { 'content-encoding': req.header('content-encoding')! } : {}),
      'X-Scope-OrgID': tenant as any,
      Authorization: envVars.CLOUD_METRICS_TOKEN,
    };

    const mimirClient = createHttpClient({
      name: 'otlp-metrics-client',
      baseURL: envVars.CLOUD_METRICS_URL,
      timeoutMs: 2000,
      retries: 0,
    });

    console.log(JSON.stringify(req.body));

    try {
      var resp = await mimirClient.request.post(
        '/otlp/v1/metrics',
        req.body,
        { headers: upstreamHeaders },
      );
    } catch(e) {
      console.log(e);
      throw e;
    }

    

    const text = await resp.data;
    res.status(resp.status).send(text);
  } catch (err: any) {
    console.log(err);
    res.status(502).send(`upstream error: ${err?.message ?? String(err)}`);
  }
});

export { router as metricsIngestRouter };
