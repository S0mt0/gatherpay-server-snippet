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

import {
  LoginUserDto,
  NewPasswordDto,
  ForgotPasswordDto,
  CodeDto,
} from './dto';
import { CreateUserDto } from './dto';

import { TIME_IN } from 'src/lib/constants';
import { DeviceInfo, Message, ParseSessionCookie } from 'src/lib/decorators';
import { BaseResponseDto } from 'src/lib/utils';
import { IDeviceInfo } from 'src/lib/interface';
import { AuthService } from './auth.service';

const REFRESH_TOKEN = 'refresh_token';
const S_ID = 's_id';

@Message()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Signup/create new account
   *
   * @remarks This operation initiates registration/creation of a new user account. If phone number verification isn't completed, registraion fails and data will not be persisted to database. This means someone else can try using the same credentials for registration.
   *
   * @throws {500} `Internal Server Error`
   * @throws {422} `Unprocessable Entity` - When payload validation fails
   * @throws {409} `Conflict` - When there's already an active signup session with the same credentials
   * @throws {429} `Too Many Requests` - Limited to 10 requests per minute
   */

  @ApiOkResponse({ example: BaseResponseDto })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: TIME_IN.minutes[1] } })
  @Message('A verification code has been sent to your phone number')
  @Post('sign-up')
  async signUp(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionId = await this.authService.signUp(createUserDto);

    res.cookie(S_ID, sessionId, {
      secure: true,
      httpOnly: true,
      sameSite: 'none',
      maxAge: TIME_IN.minutes[10],
    });
  }

  /**
   * Account/phone number verification
   *
   * @remarks After registration is initiated, user is expected to verify their phone number using the code sent during sign up.
   * If verification is successful, `client` can choose to automatically authorize *user* as `user` document and `access_token` are both returned in the response data and `refresh token` through response `cookie`. *NOTE:* `access token` is short-lived, while cookie `refresh token` is valid for 7 days. *HINT:* Client is advised to use `interceptors` to intercept all outgoing request and check if access token is expired, in that case immediately hit the `/auth/refresh-token` endpoint to refresh their token then attach the refreshed token to the previously rejected outgoing request and try again. Alternatively, client can always refresh token via the refresh route each time component mounts.
   *
   * @throws {500} `Internal Server Error`
   * @throws {422} `Unprocessable Entity` - When payload validation fails
   * @throws {401} `Unauthorized` - Registration session expired.
   * @throws {403} `Forbidden` - Invalid or expired `verification code`
   */
  @ApiOkResponse({ example: BaseResponseDto })
  @Message('Verification completed🎊')
  @Post('verify')
  async verifyAccount(
    @DeviceInfo() deviceInfo: IDeviceInfo,
    @Res({ passthrough: true }) res: Response,
    @Body() verifyAccountDto: CodeDto,
    @ParseSessionCookie() sessionId: string,
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
   * @throws {502} `Bad Gateway Error` Error sending code via Twilio
   */
  @ApiOkResponse({ type: BaseResponseDto })
  @Throttle({ default: { limit: 4, ttl: TIME_IN.minutes[1] } })
  @Message('Code sent!')
  @Get('verify/resend')
  async resendSignUpVerificationCode(
    @Res({ passthrough: true }) res: Response,
    @ParseSessionCookie() sessionId: string,
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
  @ApiOkResponse({ example: BaseResponseDto })
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
  @ApiOkResponse({ type: BaseResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post('password/forget')
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { sessionId, message } =
      await this.authService.forgotPassword(forgotPasswordDto);

    res.cookie(S_ID, sessionId, {
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
   * @throws {422} `Unprocessable Entity` - When payload validation fails
   * @throws {403} `Forbidden` - Expired or incorrect verification code
   * @throws {500} `Internal Server Error`
   * @throws {502} `Bad Gateway Error` Error sending code via Twilio
   */
  @ApiOkResponse({ type: BaseResponseDto })
  @Message('You rock! Now, create a new password🎊')
  @HttpCode(HttpStatus.OK)
  @Post('password/verify')
  async verifyPasswordResetCode(
    @Body() resetPasswordDTO: CodeDto,
    @Res({ passthrough: true }) res: Response,
    @ParseSessionCookie() sessionId: string,
  ) {
    const session = await this.authService.verifyForgotPasswordCode(
      resetPasswordDTO,
      sessionId,
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
  @ApiOkResponse({ type: BaseResponseDto })
  @HttpCode(HttpStatus.OK)
  @Put('password/reset')
  resetPassword(
    @ParseSessionCookie() sessionId: string,
    @Body() newPasswordDto: NewPasswordDto,
  ) {
    return this.authService.resetPassword(newPasswordDto, sessionId);
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
    @ParseSessionCookie() session: string,
  ) {
    const { sessionId, message } =
      await this.authService.resendForgotPasswordCode(session);

    res.cookie(S_ID, sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: TIME_IN.minutes[10],
    });

    return message;
  }

  // @Message('Logout successful')
  // @Get('logout')
  // async logout(
  //   @Res({ passthrough: true }) res: Response,
  //   @ParseSessionCookie(RT_COOKIE_KEY) refresh_token: string,
  // ) {
  //   res.clearCookie(RT_COOKIE_KEY);
  //   res.status(HttpStatus.NO_CONTENT);
  //   return this.authService.logout(refresh_token);
  // }

  // @Get('refresh-token')
  // async refreshToken(
  //   @Res({ passthrough: true }) res: Response,
  //   @ParseSessionCookie(RT_COOKIE_KEY) refresh_token: string,
  // ) {
  //   const { user, token } = await this.authService.refreshToken(refresh_token);

  //   res.setHeader('Authorization', token);
  //   res.status(HttpStatus.OK);

  //   return user;
  // }
}
