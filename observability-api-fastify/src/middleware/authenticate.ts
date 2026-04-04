import jwt from 'jsonwebtoken';
import { InternalServerError, UnauthorizedError } from '../utils/http-errors';
import { FastifyReply, FastifyRequest } from 'fastify';

export type JwtUserRole = {
  user_id?: number;
  type: string;
  created_at: string;
  updated_at?: string;
}

export type JwtUserData = {
  id: number;
  email: string;
  role: JwtUserRole;
  account_id: bigint;
}

declare module 'fastify' {
  interface FastifyRequest {
    account_id?: bigint;
    user?: JwtUserData;
  }
}

export type AuthenticateProps = {
  freshTokenRequired?: boolean;
}

export const authenticate = (props?: AuthenticateProps) => {
  return (request: FastifyRequest, _: FastifyReply, done: Function) => {
    const token = request.headers.authorization;

    let user: JwtUserData;

    if (!token) {
      throw new UnauthorizedError('No authentication token provided.');
    }

    try {
      user = jwt.verify(token, process.env.JWT_SECRET!) as JwtUserData;

      if (!user) {
        throw new InternalServerError('No user data found');
      }

      } catch(e) {
      if (e instanceof Error) {
        if (e.message === 'jwt expired' && props?.freshTokenRequired) {
          throw new UnauthorizedError('Token expired');
        } else if (e.message === 'jwt expired') {
          user = jwt.decode(token) as JwtUserData
        } else {
          throw new UnauthorizedError('Invalid token');
        }
      }
    }

    request.user = user!;
    request.account_id = user!.account_id;

    done();
  };
};
