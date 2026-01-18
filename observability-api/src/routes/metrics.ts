import { Router } from 'express';
import { getRps } from '../metrics/rps';
import { getLatency } from '../metrics/latency';
import { getInFlightRequests } from '../metrics/in-flight-requests';
import { getErrorRate } from '../metrics/error-rate';

const metricsRouter = Router();

metricsRouter.get('/metrics', async (req, res) => {
  const step = 15;
  const end = Math.floor(Date.now() / 1000 / step) * step;
  const start = end - 15 * 60;

  const [rps, latency, inFlight, errorRate] = await Promise.all([
    getRps({ serviceName: 'customer-api', tenant: 'test', start, end, step }),
    getLatency({ serviceName: 'customer-api', tenant: 'test', start, end, step }),
    getInFlightRequests({ serviceName: 'customer-api', tenant: 'test', start, end, step }),
    getErrorRate({ serviceName: 'customer-api', tenant: 'test', start, end, step }),
  ]);

  res.status(200).json({ rps, latency, inFlightRequests: inFlight, errorRate });
});

export { metricsRouter };
