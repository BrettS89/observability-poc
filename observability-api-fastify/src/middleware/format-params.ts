import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { JwtUserData } from './authenticate';

declare module 'fastify' {
  interface FastifyRequest {
    serviceParams: {
      user?: JwtUserData;
      query: any;

    }
  }
}

export const addFormatServiceParamsHook = async (fastify: FastifyInstance) => {
  fastify.addHook('onRoute', (routeOptions) => {
    const existing = Array.isArray(routeOptions.preHandler)
      ? routeOptions.preHandler
      : routeOptions.preHandler
        ? [routeOptions.preHandler]
        : [];

    // Your global hook that should run AFTER any route-level preHandlers
    const postPreHandler = async (req: FastifyRequest, _: FastifyReply) => {
      const params = {
        user: req.user,
        query: req.query,
      };

      req.serviceParams = params;
    };

    routeOptions.preHandler = [...existing, postPreHandler];
  });
};
