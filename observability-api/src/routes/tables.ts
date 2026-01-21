import { Router } from 'express';
import { get10SlowestEndpoints } from '../metrics/10-slowest-endpoints';
import { get10WorstEndpointsByErrorRate } from '../metrics/highest-error-endpoints';

const tablesRouter = Router();

tablesRouter.get('/tables', async (req, res) => {
  try {
    const [slowestEndpoints, highestErrorEndpoints] = await Promise.all([
      get10SlowestEndpoints({ serviceName: 'customer-api', tenant: 'test' }),
      get10WorstEndpointsByErrorRate({ serviceName: 'customer-api', tenant: 'test' }),
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
