import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response } from 'express';
import {
  ValidationError,
  ConnectionError,
  UniqueConstraintError,
  TimeoutError,
} from 'sequelize';

type TAppErrorResponse = {
  statusCode: number;
  response: string | object;
  timestamp: string;
};

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    console.log({ exception });

    const errorResponse: TAppErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      response: 'Internal Server Error',
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof HttpException) {
      errorResponse.statusCode = exception.getStatus();

      const response = exception.getResponse();

      if (typeof response === 'string') errorResponse.response = response;

      if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response
      ) {
        const message = response.message;

        if (typeof message === 'string') errorResponse.response = message;

        if (Array.isArray(message)) {
          if (message.every((item) => typeof item === 'string')) {
            errorResponse.response = message.join(', ');
          } else if (
            message.every(
              (item) =>
                typeof item === 'object' &&
                item !== null &&
                'message' in item &&
                typeof item.message === 'string',
            )
          ) {
            errorResponse.response = message
              .map((item) => item.message)
              .join(', ');
          } else {
            errorResponse.response = 'An unknown error occurred';
          }
        }
      }

      console.log({ msgHTTP: exception.message });
    }

    if (exception instanceof ConnectionError) {
      errorResponse.statusCode = HttpStatus.BAD_GATEWAY;
      errorResponse.response = 'Database connection failed';
      console.log({ msgConnect: exception.message });
    }

    if (exception instanceof TimeoutError) {
      errorResponse.statusCode = HttpStatus.REQUEST_TIMEOUT;
      errorResponse.response = 'Request timed out. Try again.';
      console.log({ msgTimeout: exception.message });
    }

    if (exception instanceof UniqueConstraintError) {
      errorResponse.statusCode = HttpStatus.CONFLICT;
      errorResponse.response = exception.errors
        .map((err) => err.message)
        .join(', ');

      console.log({ msgUnique: exception.message });
    }

    if (exception instanceof ValidationError) {
      errorResponse.statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
      errorResponse.response = exception.errors
        .map((err) => err.message)
        .join(', ');

      console.log({ msgValid: exception.message });
    }

    response.status(errorResponse.statusCode).json(errorResponse);

    super.catch(exception, host);
  }
}
