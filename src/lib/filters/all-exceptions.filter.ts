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

    const errorResponse: TAppErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      response: 'Internal Server Error',
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof HttpException) {
      errorResponse.statusCode = exception.getStatus();

      const response = exception.getResponse();

      if (typeof response === 'string') errorResponse.response = response;

      if (typeof response === 'object') {
        if (Object.keys(response).includes('message')) {
          const message = response['message'];

          if (Array.isArray(message))
            errorResponse.response = message.join(', ');

          if (typeof message === 'string') errorResponse.response = message;
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
