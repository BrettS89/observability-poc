import { createHttpClient } from '../http-client';
import { Router } from 'express';

const router = Router();

router.post('/otlp/metrics', async (req, res) => {
  try {
    const tenant = 'test'; // get from headers and do auth

    if (!tenant) return res.status(401).send('unauthorized');

    const upstreamHeaders: Record<string, string> = {
      'content-type': 'application/x-protobuf',
      ...(req.header('content-encoding') ? { 'content-encoding': req.header('content-encoding')! } : {}),
      'X-Scope-OrgID': tenant,
    };

    // Optionally forward User-Agent or trace headers if you want
    // upstreamHeaders['user-agent'] = req.header('user-agent') ?? 'ingest-engine';

    const mimirClient = createHttpClient({
      name: 'mimir-otlp-client',
      baseURL: 'http://mimir:9009',
      timeoutMs: 2000,
      retries: 0,
    });

    const resp = await mimirClient.request.post(
      '/otlp/v1/metrics',
      req.body,
      { headers: upstreamHeaders },
    );

    const text = await resp.data;
    res.status(resp.status).send(text);
  } catch (err: any) {
    res.status(502).send(`upstream error: ${err?.message ?? String(err)}`);
  }
});

export { router as metricsRouter };
