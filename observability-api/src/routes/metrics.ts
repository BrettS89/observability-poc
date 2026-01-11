import { Router } from 'express';
import { getRps } from '../metrics/rps';
import { getLatency } from '../metrics/latency';

const metricsRouter = Router();

metricsRouter.get('/metrics', async (req, res) => {
  const step = 15;
  const end = Math.floor(Date.now() / 1000 / step) * step;
  const start = end - 15 * 60;

  const [rps, latency] = await Promise.all([
    getRps({ serviceName: 'customer-api', tenant: 'test', start, end, step }),
    getLatency({ serviceName: 'customer-api', tenant: 'test', start, end, step }),
  ]);

  res.status(200).json({ rps, latency });
});

export { metricsRouter };
