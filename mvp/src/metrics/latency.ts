import axios from 'axios';
import { envVars } from '../config/environment-variables';
import { formatLatency } from '../utils/format';
import { MetricsRequest } from './types';
import { promAuth } from '../config/grafana-auth';

export const getLatency: MetricsRequest = async ({ serviceName, tenant, start, end, step }) => {
  const promql = `
  label_replace(
    histogram_quantile(
      0.50,
      sum by (le, job) (
        rate(http_request_duration_ms_bucket{job="${serviceName}"}[30s])
      )
    ),
    "quantile", "p50", "job", ".*"
  )
  or
  label_replace(
    histogram_quantile(
      0.95,
      sum by (le, job) (
        rate(http_request_duration_ms_bucket{job="${serviceName}"}[30s])
      )
    ),
    "quantile", "p95", "job", ".*"
  )
`;

  const resp = await axios.get(
    `${envVars.CLOUD_PROMETHEUS_URL}/api/prom/api/v1/query_range`,
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

  return formatLatency(resp.data, { start, end, step });
};
