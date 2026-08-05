export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found.") {
    super(message, 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You are not allowed to perform this action.") {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(
    message = "The request could not be completed due to a conflicting state. Please retry.",
  ) {
    super(message, 409);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required.") {
    super(message, 401);
  }
}
