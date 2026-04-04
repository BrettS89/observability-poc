import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

type Opts = {
  maxInFlight: number;
  retryAfterSeconds?: number;
};

const ingestConcurrency: FastifyPluginAsync<Opts> = async (fastify, opts) => {
  const MAX = opts.maxInFlight;
  const retryAfter = opts.retryAfterSeconds ?? 5;

  let inFlight = 0;

  fastify.addHook('onRequest', async (req, reply) => {
    if (inFlight >= MAX) {
      reply
        .code(503)
        .header('Retry-After', String(retryAfter))
      
      return { error: 'Server is busy, retry later' };
    }

    inFlight += 1;
    // mark so we only decrement if we incremented
    (req as any).__countedInFlight = true;
  });

  const dec = (req: any) => {
    if (!req.__countedInFlight) return;
    req.__countedInFlight = false;
    inFlight = Math.max(0, inFlight - 1);
  };

  fastify.addHook('onResponse', async (req) => dec(req as any));
  fastify.addHook('onError', async (req) => dec(req as any));

  // Optional: expose for debugging/metrics
  fastify.decorate('getIngestInFlight', () => inFlight);
};

export default fp(ingestConcurrency, { name: 'ingest-concurrency' });
