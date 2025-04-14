import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiOkResponse } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import {
  LoginUserDto,
  NewPasswordDto,
  ForgotPasswordDto,
  CodeDto,
} from './dto';

import {
  NP_COOKIE_KEY,
  RP_COOKIE_KEY,
  RT_COOKIE_KEY,
  TIME_IN,
  VA_COOKIE_KEY,
} from 'src/lib/constants';

import { Message, ParsedJWTCookie } from 'src/lib/decorators';
import { CreateUserDto } from './dto';
import { BaseResponseDto } from 'src/lib/utils';

@Message()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Sign up / Create new account
   *
   * @remarks This operation initiates registration/creation of a new user account. If phone number verification isn't completed, registraion fails and data will not be persisted to database. This means someone else can try using the same credentials for registration.
   *
   * @throws {500} `Internal Server Error`
   * @throws {422} `Unprocessable Entity` - When payload validation fails
   * @throws {409} `Conflict` - When there's already an active signup session with the same credentials
   * @throws {429} `Too Many Requests` - Limited to 10 requests per minute
   */
  @ApiOkResponse({ type: BaseResponseDto })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: TIME_IN.minutes[1] } })
  @Post('sign-up')
  async signUp(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { message, token } = await this.authService.signUp(createUserDto);

    // Set verify account cookie token
    res.cookie(VA_COOKIE_KEY, token, {
      secure: true,
      httpOnly: true,
      sameSite: 'none',
      maxAge: TIME_IN.minutes[10],
    });

    return message;
  }

  @Throttle({ default: { limit: 4, ttl: TIME_IN.minutes[1] } })
  @Get('resend-verification-code')
  async resendSignUpVerificationCode(
    @Res({ passthrough: true }) res: Response,
    @ParsedJWTCookie(VA_COOKIE_KEY) jwt: string,
  ) {
    const { message, token } =
      await this.authService.resendSignUpVerificationCode(jwt);

    // Set verify account cookie token
    res.cookie(VA_COOKIE_KEY, token, {
      secure: true,
      httpOnly: true,
      sameSite: 'none',
      maxAge: TIME_IN.days[7],
    });

    return message;
  }

  @Post('verify-account')
  async verifyAccount(
    @Res({ passthrough: true }) res: Response,
    @Body() verifyAccountDto: CodeDto,
    @ParsedJWTCookie(VA_COOKIE_KEY) jwt: string,
  ) {
    const user = await this.authService.verifyAccount(verifyAccountDto, jwt);

    res.clearCookie(VA_COOKIE_KEY);
    return user;
  }

  @Throttle({ default: { limit: 10, ttl: TIME_IN.minutes[1] } })
  @Message('Welcome back!🎊')
  @HttpCode(HttpStatus.OK)
  @Post('sign-in')
  async login(
    @Res({ passthrough: true }) res: Response,
    @Body() loginUserDto: LoginUserDto,
  ) {
    const { access_token, refresh_token, user } =
      await this.authService.login(loginUserDto);

    // Set access token
    res.setHeader('Authorization', access_token);

    // Set refresh token
    res.cookie(RT_COOKIE_KEY, refresh_token, {
      secure: true,
      httpOnly: true,
      sameSite: 'none',
      maxAge: TIME_IN.days[7],
    });

    return user;
  }

  @Throttle({ default: { limit: 4, ttl: TIME_IN.minutes[1] } })
  @HttpCode(HttpStatus.OK)
  @Post('password/forget')
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, message } =
      await this.authService.forgotPassword(forgotPasswordDto);

    res.cookie(RP_COOKIE_KEY, token, {
      secure: true,
      httpOnly: true,
      sameSite: 'none',
    });

    return message;
  }

  @Message('You rock! Now, create a new password🎊')
  @HttpCode(HttpStatus.OK)
  @Post('password/verify')
  async verifyPasswordResetCode(
    @ParsedJWTCookie(RP_COOKIE_KEY) jwt: string,
    @Body() resetPasswordDTO: CodeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = await this.authService.verifyPasswordResetCode(
      resetPasswordDTO,
      jwt,
    );

    res.cookie(NP_COOKIE_KEY, token, {
      secure: true,
      httpOnly: true,
      sameSite: 'none',
    });

    res.clearCookie(RP_COOKIE_KEY);
  }

  @Put('password/reset')
  async resetPassword(
    @ParsedJWTCookie(RP_COOKIE_KEY) jwt: string,
    @Body() newPasswordDto: NewPasswordDto,
  ) {
    return this.authService.resetPassword(newPasswordDto, jwt);
  }

  @Throttle({ default: { limit: 4, ttl: TIME_IN.minutes[1] } })
  @Message('Code sent!🎉')
  @Get('password/resend-code')
  async resendPasswordResetCode(
    @Res({ passthrough: true }) res: Response,
    @ParsedJWTCookie(RP_COOKIE_KEY) jwt: string,
  ) {
    const token = await this.authService.resendPasswordResetCode(jwt);

    res.cookie(RP_COOKIE_KEY, token, {
      secure: true,
      httpOnly: true,
      sameSite: 'none',
      maxAge: TIME_IN.minutes[15],
    });
  }

  @Message('Logout successful')
  @Get('logout')
  async logout(
    @Res({ passthrough: true }) res: Response,
    @ParsedJWTCookie(RT_COOKIE_KEY) refresh_token: string,
  ) {
    res.clearCookie(RT_COOKIE_KEY);
    res.status(HttpStatus.NO_CONTENT);
    return this.authService.logout(refresh_token);
  }

  @Get('refresh-token')
  async refreshToken(
    @Res({ passthrough: true }) res: Response,
    @ParsedJWTCookie(RT_COOKIE_KEY) refresh_token: string,
  ) {
    const { user, token } = await this.authService.refreshToken(refresh_token);

    res.setHeader('Authorization', token);
    res.status(HttpStatus.OK);

    return user;
  }
}
