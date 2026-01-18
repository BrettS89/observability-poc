import axios from 'axios';
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
    "http://mimir:9009/prometheus/api/v1/query_range",
    {
      params: {
        query: promql,
        start,
        end,
        step,
      },
      headers: {
        "X-Scope-OrgID": tenant,
      },
    }
  );

  return formatInFlight(resp.data);
};
