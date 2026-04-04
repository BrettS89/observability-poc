import { Pool } from 'pg';
import Fastify from 'fastify';
import cors from '@fastify/cors'
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import ajvFormats from 'ajv-formats';
import ajvKeywords from 'ajv-keywords';
import qs from 'qs';

import { postgres } from './storage/db/postgres';
import { errorHandler } from './middleware/error-handler';
// import { addFormatServiceParamsHook } from './middleware/format-params';
// import inFlightLimiter from './middleware/in-flight-limiter';
// import { goldenMetricsPlugin } from './middleware/metrics';

// import { registerExpenseTypeRoutes } from './modules/expense-type';
// import { registerExpenseRoutes } from './modules/expense';
// import { registerBudgetRoutes } from './modules/budget';
// import { registerSurplusRoutes } from './modules/surplus';

declare module 'fastify' {
  interface FastifyInstance {
    db: { pool: Pool };
  }
}

export const initApp = async () => {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      redact: ['req.headers.authorization', 'req.headers.cookie']
    },
    trustProxy: true,
    bodyLimit: 1_048_576,
    ajv: {
      customOptions: {
        allErrors: true,
        removeAdditional: true,  // optional but common
        coerceTypes: true        // optional
      },
      plugins: [
        ajvFormats,
        [ajvKeywords, ['transform']]
      ] as any
    },
    querystringParser: str => qs.parse(str, {
      decoder: function (str, defaultDecoder, charset, type) {
        const decoded = defaultDecoder(str, charset);
        if (type === 'value' && decoded === 'null') {
          return null;
        }
        return decoded;
      }
    })
  });

  await fastify.register(cors, {
    origin: true, // 👈 reflect request origin
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  });

  fastify.addHook('onRequest', async (req, _reply) => {
    req.log.info({ id: req.id, method: req.method, url: req.url, ip: req.ip }, 'request start');
  });

  fastify.addHook('onResponse', async (req, reply) => {
    req.log.info({ id: req.id, status: reply.statusCode }, 'request complete');
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  await fastify.register(compress, {
    global: true,
    threshold: 1024,
    encodings: ["br", "gzip"],
  });

  fastify.decorate('db', { pool: postgres.pool });

  await fastify.register(import('@fastify/swagger'))

  await fastify.register(import('@fastify/swagger-ui'), {
    theme: {
      title: 'finance api v2'
    },
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
      defaultModelsExpandDepth: -1,
    },
    staticCSP: true,
    transformSpecificationClone: true
  });

  // await fastify.register(goldenMetricsPlugin);

  fastify.register(async (inFlightLimiterScope) => {
    // inFlightLimiterScope.register(inFlightLimiter, { maxInFlight: 20, retryAfterSeconds: 5 });

    // register your ingestion routes here
    // ingestScope.register(ingestionRoutes);
    // inFlightLimiterScope.register(registerExpenseTypeRoutes);
    // inFlightLimiterScope.register(registerExpenseRoutes);
    // inFlightLimiterScope.register(registerBudgetRoutes);
    // inFlightLimiterScope.register(registerSurplusRoutes);
  });

  // addFormatServiceParamsHook(fastify);

  fastify.setErrorHandler(errorHandler as any);

  return fastify;
};
