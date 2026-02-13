import axios from 'axios';
import { envVars } from '../config/environment-variables';
import { formatErrorRate } from '../utils/format';
import { MetricsRequest } from './types';

export const getErrorRate: MetricsRequest = async ({ serviceName, tenant, start, end, step }) => {
  const promql = `
    100 *
      sum(rate(http_requests_total{
        job="${serviceName}",
        status_class="5xx"
      }[30s]))
      /
      clamp_min(
        sum(rate(http_requests_total{
          job="${serviceName}"
        }[30s])),
        1e-9
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

  return formatErrorRate(resp.data, { start, end, step });
};
