import { Router } from 'express';
import { getRps } from '../metrics/rps';
import { getLatency } from '../metrics/latency';
import { getInFlightRequests } from '../metrics/in-flight-requests';
import { getErrorRate } from '../metrics/error-rate';

const rangeMap = {
  '15m': { rangeSec: 15 * 60, stepSec: 15 },     // high-fidelity, live debugging
  '1h':  { rangeSec: 60 * 60, stepSec: 30 },     // short-term investigation
  '24h': { rangeSec: 24 * 60 * 60, stepSec: 120 }, // daily patterns (2m)
  '7d':  { rangeSec: 7 * 24 * 60 * 60, stepSec: 900 }, // weekly trends (15m)
} as const;

const metricsRouter = Router();

metricsRouter.get('/metrics', async (req, res) => {
  const rangeKey = (req.query.range as keyof typeof rangeMap) ?? '15m';
  const cfg = rangeMap[rangeKey] ?? rangeMap['15m'];

  const step = cfg.stepSec;

  const end = Math.floor(Date.now() / 1000 / step) * step;
  const start = end - cfg.rangeSec;

  const [rps, latency, inFlight, errorRate] = await Promise.all([
    getRps({ serviceName: 'customer-api', tenant: 'test', start, end, step }),
    getLatency({ serviceName: 'customer-api', tenant: 'test', start, end, step }),
    getInFlightRequests({ serviceName: 'customer-api', tenant: 'test', start, end, step }),
    getErrorRate({ serviceName: 'customer-api', tenant: 'test', start, end, step }),
  ]);

  res.status(200).json({ rps, latency, inFlightRequests: inFlight, errorRate });
});

export { metricsRouter };
