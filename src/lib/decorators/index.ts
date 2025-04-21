import {
  createParamDecorator,
  ExecutionContext,
  applyDecorators,
  SetMetadata,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { AuthenticationGuard } from '../guards/auth.guard';

export const ParseSessionCookie = createParamDecorator(
  (key: string = 's_id', ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const cookie = request.cookies?.[key];

    if (!cookie) {
      throw new UnauthorizedException('Session expired, try again.');
    }

    return cookie;
  },
);

export const DeviceInfo = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const deviceInfo = request['deviceInfo'];

    return data ? deviceInfo?.[data] : deviceInfo;
  },
);

export const User = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request['user'];

    return data ? user?.[data] : user;
  },
);

export const MESSAGE_KEY = 'message';
export const Message = (message: string = 'Success') => {
  return SetMetadata(MESSAGE_KEY, message);
};

export const PUBLIC_KEY = 'IS_PUBLIC';
export const Public = () => SetMetadata(PUBLIC_KEY, true);

export const Protect = () => {
  return applyDecorators(UseGuards(AuthenticationGuard));
};
