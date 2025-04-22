import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';

import { UsersService } from './users.service';
import {
  AuthSession,
  CurrentUser,
  Message,
  ParseSessionCookie,
  Protect,
} from 'src/lib/decorators';
import { User } from './models';
import { Session } from './auth/models';
import { S_2FA, TIME_IN } from 'src/lib/constants';
import { AuthService } from './auth';
import { CodeDto } from './auth/dto';

@Protect()
@Message()
@ApiBearerAuth()
@Throttle({ default: { limit: 10, ttl: TIME_IN.minutes[1] } })
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get('me')
  getCurrentUser(@CurrentUser() user: User, @AuthSession() session: Session) {
    return { user, session };
  }

  @Message('Scan the qr code or enter secret manually')
  // @Message('Two-factor-authentication enabled💪')
  @Throttle({ default: { limit: 4, ttl: TIME_IN.minutes[1] } })
  @Get('me/2fa/enable')
  async enable2FA(
    @AuthSession() session: Session,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { s_2fa, ...data } = await this.usersService.enable2FA(session);

    res.cookie(S_2FA, s_2fa, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: this.authService.S_2FA_TTL,
    });

    return data;
  }

  @Message('Two-factor-authentication enabled💪')
  @Throttle({ default: { limit: 10, ttl: TIME_IN.minutes[1] } })
  @Post('me/2fa/verify')
  async verify2FA(
    @ParseSessionCookie(S_2FA) s_2fa: string,
    @AuthSession() session: Session,
    @Res({ passthrough: true }) res: Response,
    @Body() codeDto: CodeDto,
  ) {
    const updatedSession = await this.usersService.verify2FA(
      s_2fa,
      codeDto,
      session,
    );

    res.clearCookie(S_2FA);
    return updatedSession;
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
