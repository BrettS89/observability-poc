import axios from 'axios';
import { formatRps } from '../utils/format';
import { MetricsRequest } from './types';
import { envVars } from '../config/environment-variables';

export const getRps: MetricsRequest = async ({ serviceName, tenant, start, end, step }) => {
  const promql = `
    sum(rate(http_requests_total{job="${serviceName}"}[30s]))
    `;

  const resp = await axios.get(
    `${envVars.CLOUD_METRICS_URL}/api/v1/query_range`,
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

  return formatRps(resp.data, { start, end, step });
};
