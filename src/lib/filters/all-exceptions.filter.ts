import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';
import {
  ValidationError,
  ConnectionError,
  UniqueConstraintError,
  TimeoutError,
} from 'sequelize';

type TAppErrorResponse = {
  statusCode: number;
  path: string;
  method: string;
  response: string | object;
  timestamp: string;
};

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    console.log('[exception]: ', exception);

    const errorResponse: TAppErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      path: request.url,
      method: request.method,
      response: 'Internal Server Error',
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof HttpException) {
      errorResponse.statusCode = exception.getStatus();
      errorResponse.response = exception.getResponse();
    }

    if (exception instanceof ConnectionError) {
      errorResponse.statusCode = HttpStatus.BAD_GATEWAY;
      errorResponse.response = 'Database connection failed';
    }

    if (exception instanceof TimeoutError) {
      errorResponse.statusCode = HttpStatus.REQUEST_TIMEOUT;
      errorResponse.response = 'Request timed out. Try again.';
    }

    if (exception instanceof UniqueConstraintError) {
      errorResponse.statusCode = HttpStatus.CONFLICT;
      errorResponse.response =
        exception.message.replaceAll(/\n/g, '') ||
        'Duplicate value detected in database';
    }

    if (exception instanceof ValidationError) {
      errorResponse.statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
      errorResponse.response =
        exception.message.replaceAll(/\n/g, '') || 'Invalid entity payload.';
    }

    response.status(errorResponse.statusCode).json(errorResponse);

    super.catch(exception, host);
  }
}
