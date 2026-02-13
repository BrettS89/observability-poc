import axios from 'axios';
import { envVars } from '../config/environment-variables';
import { formatInFlight } from '../utils/format';
import { MetricsRequest } from './types';

export const getInFlightRequests: MetricsRequest = async ({ serviceName, tenant, start, end, step }) => {
  const promql = `
    sum(
      http_in_flight_requests{
        job="${serviceName}"
      }
    )
  `;

  const resp = await axios.get(
    `${envVars.CLOUD_METRICS_URL}/prometheus/api/v1/query_range`,
    {
      params: {
        query: promql,
        start,
        end,
        step,
      },
      headers: {
        "X-Scope-OrgID": tenant,
        Authorization: envVars.CLOUD_METRICS_TOKEN,
      },
    }
  );

  return formatInFlight(resp.data, { start, end, step });
};
