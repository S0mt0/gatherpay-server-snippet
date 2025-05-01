import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { InjectModel } from '@nestjs/sequelize';

import { PUBLIC_KEY } from '../decorators';
import { extractBearerToken } from '../utils';
import { User } from 'src/users/models';
import { REFRESH_TOKEN } from '../constants';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    @InjectModel(User) private userModel: typeof User,
  ) {}
  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.get<boolean>(
      PUBLIC_KEY,
      context.getHandler(),
    );

    if (isPublic) return isPublic;

    const request = context.switchToHttp().getRequest<Request>();

    const refresh_token = request.cookies?.[REFRESH_TOKEN];

    if (!refresh_token)
      throw new UnauthorizedException(
        'Hey champ! Your session has expired, please log in again.',
      );

    let token: string;
    try {
      token = extractBearerToken(request);
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }

    let decoded: { sub: string; isCredentials: boolean };

    try {
      decoded = await this.jwtService.verifyAsync<{
        sub: string;
        isCredentials: boolean;
        phoneNumber: string;
      }>(token);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'Hey champ! Your session has expired, please log in again.',
        );
      }

      throw new UnauthorizedException('Invalid token.');
    }

    if (!decoded?.sub)
      throw new UnauthorizedException(
        'Hey champ! Your session has expired, please log in again.',
      );

    const user = await this.userModel.findOne({
      where: { id: decoded.sub },
      include: 'session',
    });

    const session = user.get('session');

    if (!user || !session)
      throw new UnauthorizedException(
        'Hey champ! Your session has expired, please log in again.',
      );

    if (user.provider === 'credentials' && !user.phone_verified)
      throw new ForbiddenException('Please verify your account to continue');

    request['user'] = user;
    request['authSession'] = session;

    return session.twoFactorEnabled ? !!session.twoFactorLoggedIn : true;
  }
}
