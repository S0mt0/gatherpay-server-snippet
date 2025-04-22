import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { PUBLIC_KEY } from '../decorators';
import { extractBearerToken } from '../utils';
import { CacheService } from '../services/cache/cache.service';
import { SESSION, USER } from '../constants';
import { InjectModel } from '@nestjs/sequelize';
import { Session } from 'src/users/auth/models';
import { User } from 'src/users/models';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private cache: CacheService,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Session) private sessionModel: typeof Session,
  ) {}
  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.get<boolean>(
      PUBLIC_KEY,
      context.getHandler(),
    );

    if (isPublic) return isPublic;

    const request = context.switchToHttp().getRequest<Request>();

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
      }>(token);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expired, please log in again.');
      }

      throw new UnauthorizedException('Invalid token.');
    }

    if (!decoded || !decoded.sub)
      throw new UnauthorizedException('Session expired, please log in again.');

    const user = ((await this.cache.get(USER(decoded.sub))) ||
      (await this.userModel.findOne({ where: { id: decoded.sub } }))) as User;

    const session = ((await this.cache.get(SESSION(decoded.sub))) ||
      (await this.sessionModel.findOne({
        where: { userId: decoded.sub },
      }))) as Session;

    if (!user || !session) throw new UnauthorizedException();

    request['user'] = user;
    request['authSession'] = session;

    return session.twoFactorEnabled ? !!session.twoFactorLoggedIn : true;
  }
}
