import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { CustomError } from '../utils/http-errors';

export const errorHandler = (err: FastifyError, req: FastifyRequest, reply: FastifyReply) => {
  req.log.error({ err }, 'unhandled error');

  if (err instanceof CustomError) {
    req.log.warn({ err, reqId: req.id }, 'app error');
    return reply.code(err.statusCode).send({
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      request_id: req.id
    });
  }

  reply.send(err);
};
