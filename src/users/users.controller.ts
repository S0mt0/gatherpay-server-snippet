import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
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
import { SID, SID_TTL, TFASID, TFASID_TTL, TIME_IN } from 'src/lib/constants';
import { CodeDto, UpdatePasswordDto } from './auth/dto';
import { ParseUserNotificationsQueryDto, UpdatePhoneNumberDto } from './dto';

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

  @Message('Password updated🎉')
  @Post('me/password')
  changePassword(
    @Body() updatePasswordDto: UpdatePasswordDto,
    @AuthSession() session: Session,
    @CurrentUser() user: User,
  ) {
    return this.usersService.handlePasswordChange(
      updatePasswordDto,
      user,
      session,
    );
  }

  @Post('me/phone')
  async changePhoneNumber(
    @Body() updatePhoneNumberDto: UpdatePhoneNumberDto,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.usersService.handlePhoneNumberChange(
      updatePhoneNumberDto,
      user,
    );

    res.cookie(SID, session, {
      secure: true,
      httpOnly: true,
      sameSite: 'none',
      maxAge: SID_TTL,
    });
  }

  @Post('me/phone/verify')
  async verifyPhoneNumberChange(
    @ParseSessionCookie(SID) sessionId: string,
    @CurrentUser() user: User,
    @Body() codeDto: CodeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.usersService.verifyPhoneNumberChange(sessionId, codeDto, user);
    res.clearCookie(SID);
  }

  @Get('me/notifications')
  handleNotificationPreferences(
    @CurrentUser() user: User,
    @Query() query: ParseUserNotificationsQueryDto,
  ) {
    return this.usersService.handleNotificationPreferences(query, user);
  }
}
