import type { Request, Response, NextFunction } from 'express';
import { performance } from 'node:perf_hooks';
import {
  httpRequestsTotal,
  httpRequestDurationMs,
  httpInFlight,
  eventLoopLagMs,
} from '../golden-metrics';

function statusClass(code: number): '2xx' | '3xx' | '4xx' | '5xx' | 'other' {
  if (code >= 200 && code < 300) return '2xx';
  if (code >= 300 && code < 400) return '3xx';
  if (code >= 400 && code < 500) return '4xx';
  if (code >= 500 && code < 600) return '5xx';
  return 'other';
}

// Use route template if available (best), else fallback to path
function routeLabel(req: Request): string {
  // When called after routing, Express will have req.route.path
  const r = (req as any).route?.path;
  if (typeof r === 'string') return r;
  return req.path || 'unknown';
}

export function goldenMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();

  // increment in-flight
  httpInFlight.add(1, { method: req.method, route: req.path || 'unknown' });

  res.on('finish', () => {
    const dur = performance.now() - start;
    const sc = statusClass(res.statusCode);
    const route = routeLabel(req);

    httpRequestsTotal.add(1, {
      method: req.method,
      route,
      status_class: sc,
    });

    httpRequestDurationMs.record(dur, {
      method: req.method,
      route,
      status_class: sc,
    });

    httpInFlight.add(-1, { method: req.method, route: req.path || 'unknown' });
  });

  next();
}

// Event loop lag sampler (simple + effective)
export function startEventLoopLagSampler(intervalMs = 1000) {
  let last = performance.now();

  setInterval(() => {
    const now = performance.now();
    const expected = last + intervalMs;
    const lag = Math.max(0, now - expected);

    eventLoopLagMs.record(lag);
    last = now;
  }, intervalMs).unref();
}