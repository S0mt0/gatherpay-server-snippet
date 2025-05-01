import { WhereOptions } from 'sequelize';
import { InjectModel } from '@nestjs/sequelize';
import {
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { getCountryData, type TCountryCode } from 'countries-list';

import {
  JWT_REFRESH_TOKEN_EXP,
  JWT_REFRESH_TOKEN_SECRET,
  TIME_IN,
  SIGN_UP_SESSION,
  PASSWORD_SESSION,
  APP_NAME,
  USER_2FA,
  SID_TTL,
  TFASID_TTL,
} from 'src/lib/constants';
import { CacheService, FirebaseService } from 'src/lib/services';

import { LoginUserDto, NewPasswordDto, CodeDto, OauthDto } from './dto';
import { ForgotPasswordDto } from './dto';
import { CreateUserDto } from '../dto';
import { User } from '../models/user.model';
import { TwilioService } from 'src/lib/services';
import { decrypt, encrypt, obscurePhoneNumber } from 'src/lib/utils';
import { Session } from './models';
import { IDeviceInfo } from 'src/lib/interface';

@Injectable()
export class AuthService {
  /** Refresh token `ttl` (time to live) in milliseconds
   * @constant
   */
  public REFRESH_TOKEN_TTL = TIME_IN.days[7];

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private cache: CacheService,
    private twilio: TwilioService,
    private firebaseService: FirebaseService,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Session) private sessionModel: typeof Session,
  ) {
    const exp = this.configService.get<string>(JWT_REFRESH_TOKEN_EXP);
    // Sync refresh token ttl with the jwt refresh token expiration time provided through .env.
    if (!isNaN(+exp)) this.REFRESH_TOKEN_TTL = +exp;
  }

  async findUserWithRelations(filter: { where: WhereOptions<User> }) {
    return this.userModel.findOne({
      ...filter,
      include: ['defaultBankDetail', 'allBankDetails', 'groups'],
    });
  }

  async handleSocialLogin(dto: OauthDto, deviceInfo: IDeviceInfo) {
    const user = await this.firebaseService.validateUserWithIdToken(
      dto.idToken,
    );

    const [access_token, refresh_token] = await Promise.all([
      this.generateAccessToken(user.id, user.phoneNumber),
      this.generateRefreshToken(user.id, user.phoneNumber),
    ]);

    const encrypted_refresh_token = encrypt(refresh_token);

    const session = (
      await this.sessionModel.upsert({
        userId: user.id,
        refresh_token: encrypted_refresh_token,
        lastLoggedIn: new Date(),
        deviceIpAddress: deviceInfo.ip,
        deviceLastLoggedIn: deviceInfo.device,
        loggedInDevices: [deviceInfo.device],
      })
    )[0];

    // Check if 2FA is enabled for user
    if (session.twoFactorEnabled && session.twoFactorSecret) {
      await this.cache.set(USER_2FA(user.id), user, TFASID_TTL);

      const TFASID = encrypt(user.id);

      return {
        TFASID,
        is2FARequired: true,
      };
    }

    return {
      user,
      access_token,
      refresh_token: encrypted_refresh_token,
    };
  }

  async signUp(dto: CreateUserDto, sessionId: string) {
    // Check if there's an active signup session that hasn't completed verification.
    const signUpSession = await this.cache.get<CreateUserDto>(
      SIGN_UP_SESSION(decrypt(sessionId)),
    );

    if (signUpSession)
      throw new ConflictException(
        'Phone number already in use, please verify your account.',
      );

    if (dto.password !== dto.confirm_password)
      throw new UnprocessableEntityException('Passwords do not match.');

    const userExists = await this.userModel.findOne({
      where: {
        phoneNumber: dto.phoneNumber,
      },
    });

    // Check if a verified user with the same phone number exists
    if (userExists && userExists.phone_verified)
      throw new ConflictException('Phone number taken, try another one.');

    const verificationInstance = await this.twilio.createVerifyCode(
      dto.phoneNumber,
    );

    if (verificationInstance.status !== 'pending')
      throw new BadGatewayException(
        'Error sending verification code, try again.',
      );

    const parsedPhoneNumber = parsePhoneNumberFromString(dto.phoneNumber);
    const countryCode = parsedPhoneNumber.country as TCountryCode;

    const { name: countryName, currency } = getCountryData(countryCode);

    dto = {
      ...dto,
      country: dto.country || countryName,
      defaultCurrency: currency[0],
    } as CreateUserDto;

    await this.cache.set(SIGN_UP_SESSION(dto.phoneNumber), dto, SID_TTL);

    const session = encrypt(dto.phoneNumber);
    return session;
  }

  async resendSignUpVerificationCode(sessionId: string) {
    const decrypted = decrypt(sessionId);

    const signUpSession = await this.cache.get<CreateUserDto>(
      SIGN_UP_SESSION(decrypted),
    );

    if (!signUpSession)
      throw new UnauthorizedException(
        'Session expired, please register again!',
      );

    const verificationInstance = await this.twilio.createVerifyCode(
      signUpSession.phoneNumber,
    );

    if (verificationInstance.status !== 'pending')
      throw new BadGatewayException(
        'Error sending verification code, try again.',
      );

    await this.cache.set(SIGN_UP_SESSION(decrypted), signUpSession, SID_TTL);

    return sessionId;
  }

  async verifyAccount(
    sessionId: string,
    dto: CodeDto,
    deviceInfo: IDeviceInfo,
  ) {
    const signUpSession = await this.cache.get<CreateUserDto>(
      SIGN_UP_SESSION(decrypt(sessionId)),
    );

    if (!signUpSession) {
      throw new UnauthorizedException(
        'Session expired, please register again!',
      );
    }

    const verificationCheckInstance = await this.twilio.createVerificationCheck(
      signUpSession.phoneNumber,
      dto.code,
    );

    if (verificationCheckInstance.status !== 'approved') {
      throw new ForbiddenException('Expired or incorrect code, try again.');
    }

    return await this.createVerifiedUser(signUpSession, deviceInfo);
  }

  private async createVerifiedUser(
    signUpSession: CreateUserDto,
    deviceInfo: IDeviceInfo,
  ) {
    const transaction = await this.userModel.sequelize.transaction();

    try {
      const user = await this.userModel.create(
        {
          ...signUpSession,
          phone_verified: true,
        },
        { transaction },
      );

      const [access_token, refresh_token] = await Promise.all([
        this.generateAccessToken(user.id, user.phoneNumber),
        this.generateRefreshToken(user.id, user.phoneNumber),
      ]);

      const encrypted_refresh_token = encrypt(refresh_token);

      await this.sessionModel.create(
        {
          userId: user.id,
          refresh_token: encrypted_refresh_token,
          lastLoggedIn: new Date(),
          deviceIpAddress: deviceInfo.ip,
          deviceLastLoggedIn: deviceInfo.device,
          loggedInDevices: [deviceInfo.device],
        },
        { transaction },
      );

      await transaction.commit();
      await this.cache.delete(SIGN_UP_SESSION(signUpSession.phoneNumber));

      return {
        user,
        access_token,
        refresh_token: encrypted_refresh_token,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  generateAccessToken(
    userId: string,
    phoneNumber: string,
    isCredentials = true,
  ): Promise<string> {
    return this.jwtService.signAsync({
      sub: userId,
      isCredentials,
      phoneNumber,
    });
  }

  private generateRefreshToken(
    userId: string,
    phoneNumber: string,
    isCredentials = true,
  ): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: userId,
        isCredentials,
        phoneNumber,
      },
      {
        secret: this.configService.get(JWT_REFRESH_TOKEN_SECRET),
        expiresIn: this.REFRESH_TOKEN_TTL.toString(),
      },
    );
  }

  private verifyRefreshToken(token: string) {
    return this.jwtService.verifyAsync<{
      sub: string;
      isCredentials: boolean;
      phoneNumber: string;
    }>(token, {
      secret: this.configService.get(JWT_REFRESH_TOKEN_SECRET),
    });
  }

  async login(dto: LoginUserDto, deviceInfo: IDeviceInfo) {
    const user = await this.userModel.findOne({
      where: { phoneNumber: dto.phoneNumber, provider: 'credentials' },
    });

    if (!user || !(await user.verifyPassword(dto.password)))
      throw new UnauthorizedException('Invalid credentials');

    if (user.provider === 'credentials' && !user.phone_verified)
      throw new ForbiddenException('Please verify your account to continue');

    const session = await this.sessionModel.findOne({
      where: { userId: user.id },
    });

    // Check if 2FA is enabled for user
    if (session.twoFactorEnabled && session.twoFactorSecret) {
      await this.cache.set(USER_2FA(user.id), user, TFASID_TTL);

      const TFASID = encrypt(user.id);

      return {
        TFASID,
        is2FARequired: true,
      };
    }

    const [access_token, refresh_token] = await Promise.all([
      this.generateAccessToken(user.id, user.phoneNumber),
      this.generateRefreshToken(user.id, user.phoneNumber),
    ]);

    const encrypted_refresh_token = encrypt(refresh_token);

    const currentDevices = session.loggedInDevices || [];
    const deviceAlreadyExists = currentDevices.includes(deviceInfo.device);
    const updatedDevices = deviceAlreadyExists
      ? currentDevices
      : [...currentDevices, deviceInfo.device];

    await session.update({
      refresh_token: encrypted_refresh_token,
      lastLoggedIn: new Date(),
      deviceIpAddress: deviceInfo.ip,
      deviceLastLoggedIn: deviceInfo.device,
      loggedInDevices: updatedDevices,
    });

    return {
      user,
      access_token,
      refresh_token: encrypted_refresh_token,
    };
  }

  async verify2FALogin(
    sessionId: string,
    dto: CodeDto,
    deviceInfo: IDeviceInfo,
  ) {
    const decrypted = decrypt(sessionId);

    const user = await this.cache.get<User>(USER_2FA(decrypted));

    if (!user)
      throw new UnauthorizedException('Session expired, please log in again.');

    const session = await this.sessionModel.findOne({
      where: { userId: user.id },
    });

    if (!session) throw new UnauthorizedException();

    const isValidated = this.verify2FAToken(session.twoFactorSecret, dto.code);

    if (!isValidated) throw new ForbiddenException('Invalid code');

    const [access_token, refresh_token] = await Promise.all([
      this.generateAccessToken(user.id, user.phoneNumber),
      this.generateRefreshToken(user.id, user.phoneNumber),
    ]);

    const encrypted_refresh_token = encrypt(refresh_token);

    const currentDevices = session.loggedInDevices || [];
    const deviceAlreadyExists = currentDevices.includes(deviceInfo.device);
    const updatedDevices = deviceAlreadyExists
      ? currentDevices
      : [...currentDevices, deviceInfo.device];

    await session.update({
      refresh_token: encrypted_refresh_token,
      lastLoggedIn: new Date(),
      deviceIpAddress: deviceInfo.ip,
      deviceLastLoggedIn: deviceInfo.device,
      loggedInDevices: updatedDevices,
      twoFactorLoggedIn: true,
    });

    await this.cache.delete(USER_2FA(decrypted));

    return {
      user,
      access_token,
      refresh_token: encrypted_refresh_token,
    };
  }

  forgotPassword = async (dto: ForgotPasswordDto) => {
    const user = await this.userModel.findOne({
      where: {
        phoneNumber: dto.phoneNumber,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const verificationInstance = await this.twilio.createVerifyCode(
      dto.phoneNumber,
    );

    if (verificationInstance.status !== 'pending')
      throw new BadGatewayException(
        'Error sending verification code, try again.',
      );

    await this.cache.set(PASSWORD_SESSION(dto.phoneNumber), dto, SID_TTL);

    const session = encrypt(dto.phoneNumber);

    return {
      session,
      message: `A code has been sent to ${obscurePhoneNumber(dto.phoneNumber)}`,
    };
  };

  resendForgotPasswordCode = (sessionId: string) =>
    this.forgotPassword({ phoneNumber: decrypt(sessionId) });

  async verifyForgotPasswordCode(sessionId: string, dto: CodeDto) {
    const passwordSession = await this.cache.get<ForgotPasswordDto>(
      PASSWORD_SESSION(decrypt(sessionId)),
    );

    if (!passwordSession)
      throw new UnauthorizedException('Session expired, try again.');

    const verificationCheckInstance = await this.twilio.createVerificationCheck(
      passwordSession.phoneNumber,
      dto.code,
    );

    if (verificationCheckInstance.status !== 'approved')
      throw new ForbiddenException('Incorrect or expired code, try again.');

    await this.cache.set(
      PASSWORD_SESSION(passwordSession.phoneNumber),
      passwordSession,
      SID_TTL,
    );

    return sessionId;
  }

  async resetPassword(sessionId: string, dto: NewPasswordDto) {
    const decrypted = decrypt(sessionId);

    const passwordSession = await this.cache.get<ForgotPasswordDto>(
      PASSWORD_SESSION(decrypted),
    );

    if (!passwordSession)
      throw new UnauthorizedException('Session expired, try again.');

    const user = await this.userModel.findOne({
      where: { phoneNumber: passwordSession.phoneNumber },
    });

    if (!user) throw new UnauthorizedException('User not found');

    if (dto.new_password !== dto.confirm_password)
      throw new UnprocessableEntityException('Passwords do not match');

    await user.update({ password: dto.new_password });
    await this.cache.delete(PASSWORD_SESSION(decrypted));
  }

  refreshToken = async (refresh_token: string) => {
    const activeSession = await this.sessionModel.findOne({
      where: { refresh_token },
    });

    if (!activeSession)
      throw new UnauthorizedException(
        'Hey champ! Your session has expired, please log in again.',
      );

    const decoded = await this.verifyRefreshToken(decrypt(refresh_token));

    const user = await this.userModel.findOne({
      where: { id: decoded.sub },
    });

    if (!user) {
      await activeSession.destroy();
      throw new UnauthorizedException();
    }

    const access_token = await this.generateAccessToken(
      user.id,
      user.phoneNumber,
    );

    return { access_token };
  };

  async logout(refresh_token: string) {
    const activeSession = await this.sessionModel.findOne({
      where: { refresh_token },
    });

    if (!activeSession) return;

    await activeSession.update({
      refresh_token: null,
      twoFactorLoggedIn: false,
    });
  }

  generate2FASecret(name?: string, length?: number) {
    const secret = speakeasy.generateSecret({
      length,
      name: `${APP_NAME}: ${name}`,
    });

    return { secret: secret.base32, qrCode: secret.otpauth_url };
  }

  verify2FAToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
    });
  }
}
