import axios from 'axios';
import { envVars } from '../config/environment-variables';
import { formatErrorRate } from '../utils/format';
import { MetricsRequest } from './types';
import { promAuth } from '../config/grafana-auth';

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
    `${envVars.CLOUD_METRICS_URL}/api/prom/api/v1/query_range`,
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
      auth: promAuth,

    }
  );

  return formatErrorRate(resp.data, { start, end, step });
};
