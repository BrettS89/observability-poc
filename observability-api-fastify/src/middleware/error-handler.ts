import { FastifyError, type FastifyInstance } from 'fastify';
import { CustomError } from '../utils/http-errors';

export const errorHandler: FastifyInstance['errorHandler'] = function (err, req, reply) {
  req.log.error({ err }, 'unhandled error');

  if (err instanceof CustomError) {
    req.log.warn({ err, reqId: req.id }, 'app error');
    reply.code(err.statusCode).send({
      statusCode: err.statusCode,
      message: err.message,
      request_id: req.id,
    });
    return;
  }

  reply.send(err);
};