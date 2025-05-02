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
  message: string | object;
};

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const errorResponse: TAppErrorResponse = {
      statusCode: exception?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      message:
        exception?.status === HttpStatus.TOO_MANY_REQUESTS
          ? 'Too many requests, try again later'
          : exception?.status === HttpStatus.REQUEST_TIMEOUT
            ? 'Request timed out. Try again'
            : exception?.message || 'Something unexpected happened',
    };

    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      errorResponse.statusCode = status;

      const response = exception.getResponse();

      if (typeof response === 'string')
        errorResponse.message =
          status === HttpStatus.TOO_MANY_REQUESTS
            ? 'Too many requests, try again later'
            : response;

      if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response
      ) {
        const message = response.message;

        if (typeof message === 'string') errorResponse.message = message;

        if (Array.isArray(message)) {
          if (message.every((item) => typeof item === 'string')) {
            errorResponse.message = message.join(', ');
          } else if (
            message.every(
              (item) =>
                typeof item === 'object' &&
                item !== null &&
                'message' in item &&
                typeof item.message === 'string',
            )
          ) {
            errorResponse.message = message
              .map((item) => item.message)
              .join(', ');
          } else {
            errorResponse.message = 'An unknown error occurred';
          }
        }
      }
    }

    if (exception instanceof ConnectionError) {
      errorResponse.statusCode = HttpStatus.BAD_GATEWAY;
      errorResponse.message = 'Database connection failed';
    }

    if (exception instanceof TimeoutError) {
      errorResponse.statusCode = HttpStatus.REQUEST_TIMEOUT;
      errorResponse.message = 'Request timed out. Try again';
    }

    if (exception instanceof UniqueConstraintError) {
      errorResponse.statusCode = HttpStatus.CONFLICT;
      errorResponse.message = exception.errors
        .map((err) => err.message)
        .join(', ');
    }

    if (exception instanceof ValidationError) {
      errorResponse.statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
      errorResponse.message = exception.errors
        .map((err) => err.message)
        .join(', ');
    }

    response.status(errorResponse.statusCode).json(errorResponse);

    super.catch(exception, host);
  }
}
