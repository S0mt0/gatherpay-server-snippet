import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiResponse } from '@nestjs/swagger';

import {
  LoginUserDto,
  NewPasswordDto,
  ForgotPasswordDto,
  CodeDto,
} from './dto';
import { CreateUserDto } from './dto';

import { TIME_IN } from 'src/lib/constants';
import { DeviceInfo, Message, ParsedSessionCookie } from 'src/lib/decorators';
import { getExampleResponseObject } from 'src/lib/utils';
import { IDeviceInfo } from 'src/lib/interface';
import { AuthService } from './auth.service';

const REFRESH_TOKEN = 'refresh_token';
const S_ID = 's_id';

@ApiResponse({ example: getExampleResponseObject({}) })
@Message()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Signup / create new account
   *
   * @remarks This operation initiates registration/creation of a new user account. If phone number verification isn't completed, registraion fails and data will not be persisted to database. This means the same credentials can be used to sign up for an account.
   *
   * @throws {409} `Conflict` - When there's already an active signup session with the same credentials or user already exists
   * @throws {422} `Unprocessable Entity` - When payload validation fails
   * @throws {429} `Too Many Requests` - Limited to 5 requests per minute
   * @throws {500} `Internal Server Error`
   * @throws {502} `BadGateway` Error sending verification code via `twilio verify` service.
   */

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: TIME_IN.minutes[1] } })
  @Message('A verification code has been sent to your phone number')
  @Post('sign-up')
  async signUp(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const session = await this.authService.signUp(
      createUserDto,
      req.cookies?.[S_ID],
    );

    res.cookie(S_ID, session, {
      secure: true,
      httpOnly: true,
      sameSite: 'none',
      maxAge: TIME_IN.minutes[10],
    });
  }

  /**
   * Account / phone number verification
   *
   * @remarks After registration is initiated, user is expected to verify their phone number (within 10 minutes) using the code sent during sign up. `Code` sent is valid for only 10 minutes.
   * If verification is successful, `client` can choose to automatically authorize *user* as `user` document and `access_token` are both returned in the response data and `refresh token` through response `cookie`. *NOTE:* `access token` is short-lived, while cookie `refresh token` is valid for 7 days. *HINT:* Client is advised to use `interceptors` to intercept all outgoing request and check if access token is expired, in that case immediately hit the `/auth/refresh-token` endpoint to refresh their token then attach the refreshed token to the previously rejected outgoing request and try again. Alternatively, client can always refresh token via the refresh route each time component mounts.
   *
   * @throws {401} `Unauthorized` - Registration session expired.
   * @throws {403} `Forbidden` - Invalid or expired `verification code`
   * @throws {422} `Unprocessable Entity` - When payload validation fails
   * @throws {500} `Internal Server Error`
   * @throws {502} `BadGateway` Error verifying code via `twilio verify` service.
   */
  @ApiResponse({
    example: getExampleResponseObject({
      statusCode: HttpStatus.CREATED,
      data: { user: {}, access_token: 'eg.Example.XXXXXXX.Token' },
    }),
  })
  @Message('Verification completed🎊')
  @Post('verify')
  async verifyAccount(
    @ParsedSessionCookie() sessionId: string,
    @DeviceInfo() deviceInfo: IDeviceInfo,
    @Body() verifyAccountDto: CodeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refresh_token, ...data } = await this.authService.verifyAccount(
      sessionId,
      verifyAccountDto,
      deviceInfo,
    );

    res.clearCookie(S_ID);

    res.cookie(REFRESH_TOKEN, refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: TIME_IN.days[7],
    });

    return data;
  }

  /**
   * Resend verification code
   *
   * @throws {401} `Unauthorized` - Registration session expired.
   * @throws {429} `Too Many Requests` - Limited to 4 requests per minute
   * @throws {500} `Internal Server Error`
   * @throws {502} `BadGateway` Error sending code via `Twilio verify` service
   */
  @Throttle({ default: { limit: 4, ttl: TIME_IN.minutes[1] } })
  @Message('Code sent!')
  @Get('verify/resend')
  async resendSignUpVerificationCode(
    @Res({ passthrough: true }) res: Response,
    @ParsedSessionCookie() sessionId: string,
  ) {
    const session =
      await this.authService.resendSignUpVerificationCode(sessionId);

    res.cookie(S_ID, session, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: TIME_IN.minutes[10],
    });
  }

  /**
   * Login with credentials
   *
   * @remarks NOTE:* `access token` is short-lived, while cookie `refresh token` is valid for 7 days. *HINT:* Client is advised to use `interceptors` to intercept all outgoing request and check if access token is expired, in that case immediately hit the `/auth/refresh-token` endpoint to refresh their token then attach the refreshed token to the previously rejected outgoing request and try again. Alternatively, client can always refresh token via the refresh route each time component mounts.
   *
   * @throws {401} `Unauthorized` - Invalid credentials
   * @throws {403} `Forbidden` - Unverified account
   * @throws {422} `Unprocessable Entity` - When payload validation fails
   * @throws {429} `Too Many Requests` - Limited to 10 requests per minute
   * @throws {500} `Internal Server Error`
   */
  @ApiResponse({
    example: getExampleResponseObject({
      data: { user: {}, access_token: 'eg.Example.XXXXXXX.Token' },
    }),
  })
  @HttpCode(HttpStatus.OK)
  @Message('Welcome back!🎊')
  @Throttle({ default: { limit: 10, ttl: TIME_IN.minutes[1] } })
  @Post('sign-in')
  async login(
    @DeviceInfo() deviceInfo: IDeviceInfo,
    @Res({ passthrough: true }) res: Response,
    @Body() loginUserDto: LoginUserDto,
  ) {
    const { refresh_token, ...data } = await this.authService.login(
      loginUserDto,
      deviceInfo,
    );

    res.cookie(REFRESH_TOKEN, refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: TIME_IN.days[7],
    });

    return data;
  }

  /**
   * Forget password
   *
   * @throws {404} `Notfound` - User with provided credential (phone number) was not found
   * @throws {422} `Unprocessable Entity` - Failed payload validation
   * @throws {429} `Too Many Requests` - Limited to 4 requests per minute
   * @throws {500} `Internal Server Error`
   * @throws {502} `Bad Gateway Error` Error sending code via Twilio
   */
  @Throttle({ default: { limit: 4, ttl: TIME_IN.minutes[1] } })
  @HttpCode(HttpStatus.OK)
  @Post('password/forget')
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { session, message } =
      await this.authService.forgotPassword(forgotPasswordDto);

    res.cookie(S_ID, session, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: TIME_IN.minutes[10],
    });

    return message;
  }

  /**
   * Verify code to reset forgotten password
   *
   * @throws {401} `Unauthorized` - Session expired
   * @throws {403} `Forbidden` - Expired or incorrect verification code
   * @throws {422} `Unprocessable Entity` - When payload validation fails
   * @throws {500} `Internal Server Error`
   * @throws {502} `BadGateway Error` Error sending code via Twilio
   */
  @Message('You rock! Now, create a new password🎊')
  @HttpCode(HttpStatus.OK)
  @Post('password/verify')
  async verifyPasswordResetCode(
    @Body() resetPasswordDto: CodeDto,
    @Res({ passthrough: true }) res: Response,
    @ParsedSessionCookie() sessionId: string,
  ) {
    const session = await this.authService.verifyForgotPasswordCode(
      sessionId,
      resetPasswordDto,
    );

    res.cookie(S_ID, session, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: TIME_IN.minutes[10],
    });
  }

  /**
   * Reset forgotten password
   *
   * @throws {401} `Unauthorized` - Session expired
   * @throws {422} `Unprocessable Entity` - Payload validation failed
   * @throws {500} `Internal Server Error`
   */
  @Message('Voila! Your password has been changed🥳')
  @HttpCode(HttpStatus.OK)
  @Put('password/reset')
  resetPassword(
    @Body() newPasswordDto: NewPasswordDto,
    @ParsedSessionCookie() sessionId: string,
  ) {
    return this.authService.resetPassword(sessionId, newPasswordDto);
  }

  /**
   * Resend forgot password code
   *
   * @throws {404} `Notfound` - User with provided credential (phone number) was not found
   * @throws {429} `Too Many Requests` - Limited to 4 requests per minute
   * @throws {500} `Internal Server Error`
   * @throws {502} `Bad Gateway Error` Error sending code via Twilio
   */
  @Throttle({ default: { limit: 4, ttl: TIME_IN.minutes[1] } })
  @Get('password/resend-code')
  async resendForgotPasswordCode(
    @Res({ passthrough: true }) res: Response,
    @ParsedSessionCookie() sessionId: string,
  ) {
    const { session, message } =
      await this.authService.resendForgotPasswordCode(sessionId);

    res.cookie(S_ID, session, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: TIME_IN.minutes[10],
    });

    return message;
  }

  /**
   * Logout
   *
   * @throws {401} `Unauthorized` - No valid session available to logout
   * @throws {500} `Internal Server Error`
   */
  @ApiResponse({
    example: getExampleResponseObject({
      statusCode: HttpStatus.NO_CONTENT,
    }),
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Get('logout')
  logout(
    @Res({ passthrough: true }) res: Response,
    @ParsedSessionCookie(REFRESH_TOKEN) refresh_token: string,
  ) {
    res.clearCookie(REFRESH_TOKEN);
    res.status(HttpStatus.NO_CONTENT);
    return this.authService.logout(refresh_token);
  }

  /**
   * Refresh access token
   *
   * @throws {401} `Unauthorized` - No valid session available to be refreshed
   * @throws {500} `Internal Server Error`
   */
  @ApiResponse({
    example: getExampleResponseObject({
      statusCode: HttpStatus.OK,
      data: { access_token: 'eg.Example.XXXXXXX.Token' },
    }),
  })
  @Get('refresh-token')
  refreshToken(@ParsedSessionCookie(REFRESH_TOKEN) refresh_token: string) {
    return this.authService.refreshToken(refresh_token);
  }
}
