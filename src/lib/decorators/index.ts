import {
  createParamDecorator,
  ExecutionContext,
  applyDecorators,
  SetMetadata,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { AuthenticationGuard } from '../guards';
import { S_ID } from '../constants';

export const ParseSessionCookie = createParamDecorator(
  (key: string = S_ID, ctx: ExecutionContext): string => {
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

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request['user'];

    return data ? user?.[data] : user;
  },
);

export const AuthSession = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const session = request['authSession'];

    return data ? session?.[data] : session;
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
