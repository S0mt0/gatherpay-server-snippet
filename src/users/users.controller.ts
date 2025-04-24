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
import { TFASID, TFASID_TTL, TIME_IN } from 'src/lib/constants';
import { CodeDto } from './auth/dto';

@Protect()
@Message()
@ApiBearerAuth()
@Throttle({ default: { limit: 10, ttl: TIME_IN.minutes[1] } })
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getCurrentUser(@CurrentUser() user: User) {
    return { user };
  }

  @Get('me/session')
  getSession(@AuthSession() session: Session) {
    return { session };
  }

  @Message('Scan the qr code or enter secret manually')
  @Throttle({ default: { limit: 4, ttl: TIME_IN.minutes[1] } })
  @Get('me/2fa/enable')
  async enable2FA(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { TFASID, ...data } = await this.usersService.enable2FA(user);

    res.cookie(TFASID, TFASID, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: TFASID_TTL,
    });

    return data;
  }

  @Message('Two-factor-authentication enabled💪')
  @Throttle({ default: { limit: 10, ttl: TIME_IN.minutes[1] } })
  @Post('me/2fa/verify')
  async verify2FA(
    @ParseSessionCookie(TFASID) TFASID: string,
    @AuthSession() session: Session,
    @Res({ passthrough: true }) res: Response,
    @Body() codeDto: CodeDto,
  ) {
    const updatedSession = await this.usersService.verify2FA(
      TFASID,
      codeDto,
      session,
    );

    res.clearCookie(TFASID);
    return updatedSession;
  }

  @Message('Two-factor-authentication disabled.')
  @Throttle({ default: { limit: 4, ttl: TIME_IN.minutes[1] } })
  @Get('me/2fa/disable')
  disable2FA(@AuthSession() session: Session) {
    return this.usersService.disable2FA(session);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
