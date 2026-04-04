// fastify-golden-metrics.ts
import type { FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';
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

// Prefer Fastify's route "pattern" (template), else fall back to raw URL.
function routeLabel(req: any): string {
  // Fastify v4/v5 expose the matched route pattern as `routerPath` (and/or `routeOptions.url`)
  const routerPath = req.routerPath;
  if (typeof routerPath === 'string') return routerPath;

  const routeUrl = req.routeOptions?.url;
  if (typeof routeUrl === 'string') return routeUrl;

  // Fallback: strip query string
  const raw = req.raw?.url;
  if (typeof raw === 'string') return raw.split('?')[0] || 'unknown';

  return 'unknown';
}

/**
 * Fastify plugin version of your Express middleware.
 *
 * Usage:
 *   fastify.register(goldenMetricsPlugin)
 */
export const goldenMetricsPlugin = fp((fastify, _opts, done) => {
  // Runs early for every request
  fastify.addHook('onRequest', async (req) => {
    // store start time on request
    (req as any).__gmStart = performance.now();

    const route = routeLabel(req);
    httpInFlight.add(1, { method: req.method, route });
  });

  // Runs after response is sent (success or error)
  fastify.addHook('onResponse', async (req, reply) => {
    const start = (req as any).__gmStart as number | undefined;
    const dur = typeof start === 'number' ? performance.now() - start : 0;

    const sc = statusClass(reply.statusCode);
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

    httpInFlight.add(-1, { method: req.method, route });
  });

  // If you want to be extra-safe, also decrement inflight on errors that short-circuit.
  // (onResponse typically fires, but this covers some edge cases / plugin interference.)
  fastify.addHook('onError', async (req) => {
    const route = routeLabel(req);
    httpInFlight.add(-1, { method: req.method, route });
  });

  done();
});

// Event loop lag sampler (same as your Express version)
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