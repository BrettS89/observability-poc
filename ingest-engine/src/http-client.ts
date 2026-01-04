import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

type HttpClientConfig = {
  name: string;
  baseURL: string;
  timeoutMs: number;
  totalBudgetMs?: number;
  retries: number;
  retryOn429?: boolean;
  headers?: Record<string, string>;
}

export const createHttpClient = (config: HttpClientConfig) => {
  const client: AxiosInstance = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeoutMs,
    headers: config.headers,
  });

  axiosRetry(client, {
    retries: config.retries,
    retryCondition: err => {
      if (axiosRetry.isNetworkOrIdempotentRequestError(err))  {
        return true;
      }

      const status = err.response?.status;

      if (config.retryOn429 && status === 429) return true;

      return status === 500 || status === 502 || status === 503 || status === 504;
    },
    retryDelay: (retryCount, err) => {
      const ra = err.response?.headers?.["retry-after"];

      if (ra) {
        const seconds = Number(ra);
        if (!Number.isNaN(seconds)) return seconds * 1000;
      }

      return axiosRetry.exponentialDelay(retryCount);
    },
    onRetry: (retryCount, err, req) => {
      const status = err.response?.status;
      console.log(`[${config.name}] retry #${retryCount} ${req.method?.toUpperCase()} ${req.url} status=${status ?? "n/a"}`);
    },
  });


  return { request: client };
};
