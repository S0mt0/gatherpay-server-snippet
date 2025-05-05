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
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
} from '@nestjs/swagger';

import {
  LoginUserDto,
  NewPasswordDto,
  ForgotPasswordDto,
  CodeDto,
  OauthDto,
} from './dto';
import { CreateUserDto } from '../dto';

import {
  REFRESH_TOKEN,
  TFASID,
  TIME_IN,
  EXAMPLE_RESPONSE_OBJ,
} from 'src/lib/constants';
import { DeviceInfo, Message, ParseSessionCookie } from 'src/lib/decorators';
import { IDeviceInfo } from 'src/lib/interface';
import { AuthService } from './auth.service';

@Message()
@ApiOkResponse({ example: EXAMPLE_RESPONSE_OBJ })
@Throttle({ default: { limit: 4, ttl: TIME_IN.minutes[1] } })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Authenticate via social providers (Google, Facebook, etc)
   * @remarks Supported providers include `google.com`, `apple.com`, `facebook.com`
   *
   * @throws {400} `Bad Request` - Unsupported provider
   * @throws {403} `Forbidden` - User tries to continue with a different provider than they used to register
   * @throws {409} `Conflict` - User already exists
   * @throws {422} `Unprocessable Entity` Failed payload validation
   * @throws {429} `Too Many Requests` - Max of 10 requests per minute
   */
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: TIME_IN.minutes[1] } })
  @Post('oauth')
  handleSocialLogin(
    @Body() oauthDto: OauthDto,
    @DeviceInfo() deviceInfo: IDeviceInfo,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.handleSocialLogin(oauthDto, deviceInfo, res);
  }

  /**
   * Sign-up / create new account
   * @remarks This operation initiates registration/creation of a new user account. If phone number verification isn't completed, registraion fails and data will not be persisted to database. This means the same credentials can be used to sign up for an account.
   *
   * @throws {409} `Conflict` - When there's already an active signup session with the same credentials or user already exists
   * @throws {422} `Unprocessable Entity` - Failed payload validation
   * @throws {429} `Too Many Requests` - Max of 4 requests per minute
   * @throws {502} `BadGateway` Error sending verification code via `twilio verify` service.
   */
  @Message('A verification code has been sent to your phone number')
  @Post('sign-up')
  signUp(
    @Body() createUserDto: CreateUserDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.signUp(createUserDto, req, res);
  }

  /**
   * Account / phone number verification
   * @remarks After registration is initiated, user is expected to verify their phone number (within 10 minutes) using the code sent during sign up. `Code` sent is valid for only 10 minutes.
   * If verification is successful, `client` can choose to automatically authorize *user* as `user` document and `access_token` are both returned in the response data and `refresh token` through response `cookie`. *NOTE:* `access token` is short-lived, while cookie `refresh token` is valid for 3 days. *HINT:* Client is advised to use `interceptors` to intercept all outgoing request and check if access token is expired, in that case immediately hit the `/auth/refresh-token` endpoint to refresh their token then attach the refreshed token to the previously rejected outgoing request and try again. Alternatively, client can always refresh token via the refresh route each time component mounts.
   *
   * @throws {401} `Unauthorized` - Registration session expired.
   * @throws {403} `Forbidden` - Invalid or expired `verification code`
   * @throws {422} `Unprocessable Entity` - Failed payload validation
   * @throws {429} `Too Many Requests` - Max of 4 requests per minute
   * @throws {502} `BadGateway` Error verifying code via `twilio verify` service.
   */
  @ApiCreatedResponse({ example: EXAMPLE_RESPONSE_OBJ })
  @Message('Verification completed🎊')
  @Post('verify')
  verifyAccount(
    @ParseSessionCookie() sessionId: string,
    @DeviceInfo() deviceInfo: IDeviceInfo,
    @Body() verifyAccountDto: CodeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.verifyAccount(
      sessionId,
      verifyAccountDto,
      deviceInfo,
      res,
    );
  }

  /**
   * Resend signup verification code
   * @throws {401} `Unauthorized` - Registration session expired.
   * @throws {429} `Too Many Requests` - Max of 4 requests per minute
   * @throws {502} `BadGateway` Error sending code via `Twilio verify` service
   */
  @Message('Code sent!')
  @Get('verify/resend')
  resendSignUpVerificationCode(
    @Res({ passthrough: true }) res: Response,
    @ParseSessionCookie() sessionId: string,
  ) {
    return this.authService.resendSignUpVerificationCode(sessionId, res);
  }

  /**
   * Login with credentials
   * @remarks NOTE:* `access token` is short-lived, while cookie `refresh token` is valid for 3 days. *HINT:* Client is advised to use `interceptors` to intercept all outgoing request and check if access token is expired, in that case immediately hit the `/auth/refresh-token` endpoint to refresh their token then attach the refreshed token to the previously rejected outgoing request and try again. Alternatively, client can always refresh token via the refresh route each time component mounts.
   *
   * @throws {401} `Unauthorized` - Invalid credentials
   * @throws {403} `Forbidden` - Unverified account
   * @throws {422} `Unprocessable Entity` - Failed payload validation
   * @throws {429} `Too Many Requests` - Max of 4 requests per minute
   */
  @Message('Welcome back!🎊')
  @HttpCode(HttpStatus.OK)
  @Post('sign-in')
  login(
    @DeviceInfo() deviceInfo: IDeviceInfo,
    @Res({ passthrough: true }) res: Response,
    @Body() loginUserDto: LoginUserDto,
  ) {
    return this.authService.login(loginUserDto, deviceInfo, res);
  }

  /**
   * Verify 2FA Login
   * @remarks Provide code generated from any authentication app that has been linked with your account
   *
   * @throws {401} `Unauthorized` - No or expired sign-in session
   * @throws {403} `Forbidden` - Invalid code
   * @throws {422} `Unprocessable Entity` - Failed payload validation
   * @throws {429} `Too Many Requests` - Max of 10 requests per minute
   */
  @Message('Welcome back!🎊')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: TIME_IN.minutes[1] } })
  @Post('sign-in/2fa/verify')
  verify2FALogin(
    @ParseSessionCookie(TFASID) TFASID: string,
    @DeviceInfo() deviceInfo: IDeviceInfo,
    @Res({ passthrough: true }) res: Response,
    @Body() codeDto: CodeDto,
  ) {
    return this.authService.verify2FALogin(TFASID, codeDto, deviceInfo, res);
  }

  /**
   * Forget password
   * @throws {404} `Notfound` - User with provided credential (phone number) was not found
   * @throws {422} `Unprocessable Entity` - Failed payload validation
   * @throws {429} `Too Many Requests` - Max of 4 requests per minute
   * @throws {502} `Bad Gateway Error` Error sending code via Twilio
   */
  @HttpCode(HttpStatus.OK)
  @Post('password/forget')
  forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.forgotPassword(forgotPasswordDto, res);
  }

  /**
   * Verify code to reset forgotten password
   *
   * @throws {401} `Unauthorized` - Expired or no session
   * @throws {403} `Forbidden` - Expired or incorrect verification code
   * @throws {422} `Unprocessable Entity` - Failed payload validation
   * @throws {429} `Too Many Requests` - Max of 4 requests per minute
   * @throws {502} `BadGateway Error` Error sending code via Twilio
   */
  @Message('You rock! Now, create a new password.')
  @HttpCode(HttpStatus.OK)
  @Post('password/verify')
  verifyPasswordResetCode(
    @Body() resetPasswordDto: CodeDto,
    @Res({ passthrough: true }) res: Response,
    @ParseSessionCookie() sessionId: string,
  ) {
    return this.authService.verifyForgotPasswordCode(
      sessionId,
      resetPasswordDto,
      res,
    );
  }

  /**
   * Reset forgotten password
   *
   * @throws {401} `Unauthorized` - Session expired
   * @throws {422} `Unprocessable Entity` - Payload validation failed
   * @throws {429} `Too Many Requests` - Max of 4 requests per minute
   */
  @Message('Voila! Your password has been changed🥳')
  @HttpCode(HttpStatus.OK)
  @Put('password/reset')
  resetPassword(
    @Body() newPasswordDto: NewPasswordDto,
    @ParseSessionCookie() sessionId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.resetPassword(sessionId, newPasswordDto, res);
  }

  /**
   * Resend forgot password code
   *
   * @throws {404} `Notfound` - User with provided credential (phone number) was not found
   * @throws {429} `Too Many Requests` - Max of 4 requests per minute
   * @throws {502} `Bad Gateway Error` Error sending code via Twilio
   */
  @Get('password/resend-code')
  resendForgotPasswordCode(
    @Res({ passthrough: true }) res: Response,
    @ParseSessionCookie() sessionId: string,
  ) {
    return this.authService.resendForgotPasswordCode(sessionId, res);
  }

  /**
   * Logout
   * @throws {429} `Too Many Requests` - Max of 4 requests per minute
   */
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Get('sign-out')
  logout(
    @Res({ passthrough: true }) res: Response,
    @ParseSessionCookie(REFRESH_TOKEN) refresh_token: string, // todo: remove device from array of logged in devices
  ) {
    return this.authService.logout(refresh_token, res);
  }

  /**
   * Refresh access token
   *
   * @throws {401} `Unauthorized` - No valid session or user available to be refreshed
   * @throws {429} `Too Many Requests` - Max of 4 requests per minute
   */
  @Get('refresh-token')
  refreshToken(@ParseSessionCookie(REFRESH_TOKEN) refresh_token: string) {
    return this.authService.refreshToken(refresh_token);
  }
}
