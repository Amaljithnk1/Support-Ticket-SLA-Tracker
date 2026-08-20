import { GraphQLError } from 'graphql';

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TICKET_NOT_FOUND = 'TICKET_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
  INVALID_PRIORITY = 'INVALID_PRIORITY',
}

export class AppError extends GraphQLError {
  constructor(message: string, code: ErrorCode) {
    super(message, {
      extensions: {
        code,
      },
    });
  }
}
