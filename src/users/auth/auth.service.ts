import { Transaction } from 'sequelize';
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

import {
  JWT_REFRESH_TOKEN_EXP,
  JWT_REFRESH_TOKEN_SECRET,
  TIME_IN,
  USER_SESSION,
  SIGN_UP_SESSION,
  PASSWORD_SESSION,
} from 'src/lib/constants';
import { CacheService } from 'src/lib/services';

import { LoginUserDto, NewPasswordDto, CodeDto } from './dto';
import { ForgotPasswordDto } from './dto';
import { CreateUserDto } from './dto';
import { User } from '../models/user.model';
import { TwilioService } from 'src/lib/services';
import { decrypt, encrypt, obscurePhoneNumber } from 'src/lib/utils';
import { Session } from './models/session.model';
import { IDeviceInfo } from 'src/lib/interface';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private cache: CacheService,
    private twilio: TwilioService,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Session) private sessionModel: typeof Session,
  ) {}

  async signUp(dto: CreateUserDto, sessionId: string) {
    const decrypted = decrypt(sessionId || '');

    if (decrypted && decrypted === dto.phoneNumber)
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

    if (userExists && userExists.verified_phone)
      throw new ConflictException('Phone number already in use, try again.');

    const verificationInstance = await this.twilio.createVerifyCode(
      dto.phoneNumber,
    );

    if (verificationInstance.status !== 'pending')
      throw new BadGatewayException(
        'Error sending verification code, try again.',
      );

    const session = encrypt(dto.phoneNumber);

    await this.cache.set(
      SIGN_UP_SESSION(dto.phoneNumber),
      dto,
      TIME_IN.minutes[10],
    );

    return session;
  }

  async resendSignUpVerificationCode(sessionId: string) {
    const signUpSession = await this.cache.get<CreateUserDto>(
      SIGN_UP_SESSION(decrypt(sessionId || '')),
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

    await this.cache.set(
      SIGN_UP_SESSION(signUpSession.phoneNumber),
      signUpSession,
      TIME_IN.minutes[10],
    );

    return sessionId;
  }

  async verifyAccount(
    sessionId: string,
    dto: CodeDto,
    IdeviceInfo: IDeviceInfo,
  ) {
    const signUpSession = await this.cache.get<CreateUserDto>(
      SIGN_UP_SESSION(decrypt(sessionId || '')),
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

    console.log({ verificationCheckInstance });

    if (verificationCheckInstance.status !== 'approved') {
      throw new ForbiddenException('Expired or incorrect code, try again.');
    }

    return await this.createVerifiedUser(signUpSession, IdeviceInfo);
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
          verified_phone: true,
        },
        { transaction },
      );

      const [access_token, refresh_token] = await Promise.all([
        this.generateAccessToken(user.id),
        this.generateRefreshToken(user.id),
      ]);

      await this.updateUserSession({
        transaction,
        userId: user.id,
        refresh_token,
        deviceInfo,
      });

      await transaction.commit();

      await Promise.all([
        this.cache.delete(SIGN_UP_SESSION(signUpSession.phoneNumber)),
        this.cacheSessionUser(user),
      ]);

      return { user, access_token, refresh_token };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  private async cacheSessionUser(user: User) {
    await this.cache.set(
      USER_SESSION(user.id),
      user.toJSON(),
      this.configService.get(JWT_REFRESH_TOKEN_EXP, TIME_IN.days[7]),
    );
  }

  private async generateAccessToken(
    userId: string,
    isCredentials = true,
  ): Promise<string> {
    return this.jwtService.signAsync({
      sub: userId,
      isCredentials,
    });
  }

  private async generateRefreshToken(
    userId: string,
    isCredentials = true,
  ): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: userId,
        isCredentials,
      },
      {
        secret: this.configService.get(JWT_REFRESH_TOKEN_SECRET),
        expiresIn: this.configService.get(JWT_REFRESH_TOKEN_EXP, '7d'),
      },
    );
  }

  private async updateUserSession({
    deviceInfo,
    refresh_token,
    transaction,
    userId,
  }: {
    transaction?: Transaction;
    userId: string;
    refresh_token: string;
    deviceInfo?: IDeviceInfo;
  }): Promise<void> {
    if (!deviceInfo.device.trim().length) {
      console.log('Invalid device information');

      deviceInfo = {
        ...deviceInfo,
        device: 'Unknown device',
      };
    }

    if (!deviceInfo.ip.trim().length) {
      console.log('Invalid IP address');

      deviceInfo = {
        ...deviceInfo,
        ip: 'Unknown IP address',
      };
    }

    const existingSession = await this.sessionModel.findOne({
      where: { userId },
      transaction,
    });

    const currentDevices = existingSession?.logged_in_devices || [];

    const deviceAlreadyExists = currentDevices.includes(deviceInfo.device);

    const updatedDevices = deviceAlreadyExists
      ? currentDevices
      : [...currentDevices, deviceInfo.device];

    await this.sessionModel.upsert(
      {
        userId,
        refresh_token: encrypt(refresh_token),
        lastLoggedIn: new Date(),
        deviceIpAddress: deviceInfo.ip,
        deviceLastLoggedIn: deviceInfo.device,
        logged_in_devices: updatedDevices,
      },
      { transaction },
    );
  }

  async login(dto: LoginUserDto, deviceInfo: IDeviceInfo) {
    const user = await this.userModel.findOne({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (!user) {
      console.error(`User not found for phone number: ${dto.phoneNumber}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isCorrectPassword = await user.verifyPassword(dto.password);

    if (!isCorrectPassword) {
      console.error(`Invalid password for user: ${user.phoneNumber}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.verified_phone)
      throw new ForbiddenException('Please verify your account to continue');

    const [access_token, refresh_token] = await Promise.all([
      this.generateAccessToken(user.id),
      this.generateRefreshToken(user.id),
    ]);

    await Promise.all([
      this.updateUserSession({ userId: user.id, refresh_token, deviceInfo }),
      this.cacheSessionUser(user),
    ]);

    return { user, access_token, refresh_token };
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

    await this.cache.set(
      PASSWORD_SESSION(dto.phoneNumber),
      dto,
      TIME_IN.minutes[10],
    );

    const session = encrypt(dto.phoneNumber);

    return {
      session,
      message: `A code has been sent to ${obscurePhoneNumber(dto.phoneNumber)}`,
    };
  };

  resendForgotPasswordCode = (sessionId: string) =>
    this.forgotPassword({ phoneNumber: decrypt(sessionId || '') });

  async verifyForgotPasswordCode(sessionId: string, dto: CodeDto) {
    const passwordSession = await this.cache.get<ForgotPasswordDto>(
      PASSWORD_SESSION(decrypt(sessionId || '')),
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
      TIME_IN.minutes[10],
    );

    return sessionId;
  }

  async resetPassword(sessionId: string, dto: NewPasswordDto) {
    const passwordSession = await this.cache.get<ForgotPasswordDto>(
      PASSWORD_SESSION(decrypt(sessionId || '')),
    );

    if (!passwordSession)
      throw new UnauthorizedException('Session expired, try again.');

    const user = await this.userModel.findOne({
      where: { phoneNumber: passwordSession.phoneNumber },
    });

    if (!user) throw new UnauthorizedException('User not found');

    if (dto.new_password !== dto.confirm_password)
      throw new UnprocessableEntityException('Passwords do not match');

    user.password = dto.new_password;
    await Promise.all([
      user.save(),
      this.cache.delete(PASSWORD_SESSION(user.phoneNumber)),
    ]);
  }

  refreshToken = async (refresh_token: string) => {
    const activeSession = await this.sessionModel.findOne({
      where: { refresh_token },
    });

    if (!activeSession)
      throw new UnauthorizedException('Session expired, please log in again.');

    const access_token = await this.generateAccessToken(activeSession.userId);

    return { access_token };
  };

  async logout(refresh_token: string) {
    const session = await this.sessionModel.findOne({
      where: { refresh_token },
    });

    if (!session) throw new UnauthorizedException();

    await this.sessionModel.update(
      { refresh_token: '' },
      {
        where: { refresh_token },
      },
    );
  }
}
