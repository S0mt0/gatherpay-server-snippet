import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { MESSAGE_KEY } from '../decorators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const res = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        const message = this.reflector.getAllAndOverride<string>(MESSAGE_KEY, [
          context.getHandler(),
          context.getClass(),
        ]);

        if (data === null || data === undefined) {
          return {
            statusCode: res.statusCode,
            message,
            timestamp: new Date().toISOString(),
          };
        } else if (typeof data === 'string' && data.trim().length) {
          return {
            statusCode: res.statusCode,
            message: data,
            timestamp: new Date().toISOString(),
          };
        } else {
          return {
            statusCode: res.statusCode,
            message,
            data,
            timestamp: new Date().toISOString(),
          };
        }
      }),
    );
  }
}
