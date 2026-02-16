import { Router } from 'express';
import { get10SlowestEndpoints } from '../metrics/10-slowest-endpoints';
import { get10WorstEndpointsByErrorRate } from '../metrics/highest-error-endpoints';

const tablesRouter = Router();

tablesRouter.get('/tables', async (req, res) => {
  const tenant = req.query.tenant as string;
  const serviceName = req.query.service as string;

  const range = (req.query.range ?? '15m') as string;

  try {
    const [slowestEndpoints, highestErrorEndpoints] = await Promise.all([
      get10SlowestEndpoints({ serviceName, tenant, range }),
      get10WorstEndpointsByErrorRate({ serviceName, tenant, range }),
    ]);

    res.status(200).json({
      endpoint_latency: slowestEndpoints,
      endpoint_errors: highestErrorEndpoints,
    });
  } catch(e) {
    //@ts-ignore
    res.status(500).json({ error: e.message });
    console.log(e);
  }
  
});

export { tablesRouter };
