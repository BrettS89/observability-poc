export abstract class CustomError extends Error {
  abstract statusCode: number;
  abstract error: string;

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

export class BadRequestError extends CustomError {
  error = 'Bad Request';
  statusCode = 400;

  constructor(public message: string) {
    super(message);

    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class UnauthorizedError extends CustomError {
  error = 'Unauthorized';
  statusCode = 401;

  constructor(public message: string) {
    super(message);

    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class ForbiddenError extends CustomError {
  error = 'Forbidden';
  statusCode = 403;

  constructor(public message: string) {
    super(message);

    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class NotFoundError extends CustomError {
  error = 'Not Found';
  statusCode = 404;

  constructor(public message: string) {
    super(message);

    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class ConflictError extends CustomError {
  error = 'Conflict';
  statusCode = 409;

  constructor(public message: string) {
    super(message);

    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}


export class InternalServerError extends CustomError {
  error = 'Internal Server Error';
  statusCode = 500;

  constructor(public message: string) {
    super(message);

    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class ServiceUnavailableError extends CustomError {
  error = 'Service Unavailable';
  statusCode = 503;

  constructor(public message: string) {
    super(message);

    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}
