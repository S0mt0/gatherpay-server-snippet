import { Transaction } from 'sequelize';
import { InjectModel } from '@nestjs/sequelize';
import {
  BadGatewayException,
  BadRequestException,
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

  async signUp(dto: CreateUserDto) {
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

    const sessionId = encrypt(dto.phoneNumber);

    await this.cache.set(
      SIGN_UP_SESSION(dto.phoneNumber),
      dto,
      TIME_IN.minutes[10],
    );

    return sessionId;
  }

  async resendSignUpVerificationCode(sessionId: string) {
    const signUpSession = await this.cache.get<CreateUserDto>(
      SIGN_UP_SESSION(decrypt(sessionId)),
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
    IdeviceInfo?: IDeviceInfo,
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

    console.log({ verificationCheckInstance });

    if (verificationCheckInstance.status !== 'approved') {
      throw new ForbiddenException('Expired or incorrect code, try again.');
    }

    return await this.createVerifiedUser(sessionId, signUpSession, IdeviceInfo);
  }

  private async createVerifiedUser(
    sessionId: string,
    signUpSession: CreateUserDto,
    IdeviceInfo?: IDeviceInfo,
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

      await this.updateVerifiedUserSession(
        transaction,
        user.id,
        refresh_token,
        IdeviceInfo,
      );

      await transaction.commit();

      await Promise.all([
        this.cache.delete(SIGN_UP_SESSION(sessionId)),
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

  private async updateVerifiedUserSession(
    transaction: Transaction,
    userId: string,
    refreshToken: string,
    IdeviceInfo?: IDeviceInfo,
  ): Promise<void> {
    if (!IdeviceInfo?.device || !IdeviceInfo?.ip) {
      throw new BadRequestException('Invalid device information');
    }

    const existingSession = await this.sessionModel.findOne({
      where: { userId },
      transaction,
    });

    const currentDevices = existingSession?.logged_in_devices || [];

    const deviceAlreadyExists = currentDevices.includes(IdeviceInfo.device);

    const updatedDevices = deviceAlreadyExists
      ? currentDevices
      : [...currentDevices, IdeviceInfo.device];

    await this.sessionModel.upsert(
      {
        userId,
        refresh_token: encrypt(refreshToken),
        lastLoggedIn: new Date(),
        deviceIpAddress: IdeviceInfo.ip,
        deviceLastLoggedIn: IdeviceInfo.device,
        logged_in_devices: updatedDevices,
      },
      { transaction },
    );
  }

  async login(dto: LoginUserDto, IdeviceInfo?: IDeviceInfo) {
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

    //  Update session
    if (!IdeviceInfo?.device || !IdeviceInfo?.ip) {
      throw new BadRequestException('Invalid device information');
    }

    const existingSession = await this.sessionModel.findOne({
      where: { userId: user.id },
    });

    const currentDevices = existingSession?.logged_in_devices || [];

    const deviceAlreadyExists = currentDevices.includes(IdeviceInfo.device);

    const updatedDevices = deviceAlreadyExists
      ? currentDevices
      : [...currentDevices, IdeviceInfo.device];

    await Promise.all([
      this.sessionModel.upsert({
        userId: user.id,
        refresh_token: encrypt(refresh_token),
        lastLoggedIn: new Date(),
        deviceIpAddress: IdeviceInfo.ip,
        deviceLastLoggedIn: IdeviceInfo.device,
        logged_in_devices: updatedDevices,
      }),

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

    const sessionId = encrypt(dto.phoneNumber);

    return {
      sessionId,
      message: `A code has been sent to ${obscurePhoneNumber(dto.phoneNumber)}`,
    };
  };

  resendForgotPasswordCode = async (sessionId: string) => {
    const decoded = decrypt(sessionId) as string;

    if (!decoded)
      throw new UnauthorizedException('Session expired, try again.');

    return this.forgotPassword({ phoneNumber: decoded });
  };

  async verifyForgotPasswordCode(dto: CodeDto, sessionId: string) {
    const decoded = decrypt(sessionId) as string;

    const passwordSession = await this.cache.get<ForgotPasswordDto>(
      PASSWORD_SESSION(decoded),
    );

    if (!decoded || !passwordSession)
      throw new UnauthorizedException('Session expired, try again.');

    const verificationCheckInstance = await this.twilio.createVerificationCheck(
      passwordSession.phoneNumber,
      dto.code,
    );

    if (verificationCheckInstance.status !== 'approved')
      throw new ForbiddenException('Incorrect or expired code, try again.');

    await this.cache.set(
      PASSWORD_SESSION(passwordSession.phoneNumber),
      dto,
      TIME_IN.minutes[10],
    );

    return sessionId;
  }

  async resetPassword(dto: NewPasswordDto, sessionId: string) {
    const decoded = decrypt(sessionId) as string;

    const passwordSession = await this.cache.get<ForgotPasswordDto>(
      PASSWORD_SESSION(decoded),
    );

    if (!decoded || !passwordSession)
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
      this.cache.delete(PASSWORD_SESSION(decoded)),
    ]);
  }

  // refreshToken = async (refresh_token: string) => {
  //   const user = await this.userModel.findOne({ where: { refresh_token } });

  //   if (!user)
  //     throw new UnauthorizedException('Session expired, please log in again.');

  //   const token = await this.jwtService.signAsync({
  //     sub: user.id,
  //   });

  //   return { user, token };
  // };

  // async logout(refresh_token: string) {
  //   // Is refresh_token in db?
  //   const user = await this.userModel.findOne({ where: { refresh_token } });
  //   if (!user) throw new UnauthorizedException();

  //   const transaction = await this.userModel.sequelize.transaction();

  //   try {
  //     user.refresh_token = '';
  //     await user.save({ transaction });

  //     await this.sessionModel.update(
  //       { refresh_token: '' },
  //       {
  //         where: { userId: user.id },
  //         transaction,
  //       },
  //     );
  //   } catch (error) {
  //     console.error({ error });
  //     await transaction.rollback();
  //   }
  // }

  // async _verifyAccount(dto: CodeDto, IdeviceInfo: IDeviceInfo) {
  //   const signUpSession = await this.cache.get<CreateUserDto>(
  //     SIGN_UP_SESSION(dto.sessionId),
  //   );

  //   if (!signUpSession)
  //     throw new UnauthorizedException(
  //       'Session expired, please register again!',
  //     );

  //   const verificationCheckInstance = await this.twilio.createVerificationCheck(
  //     signUpSession.phoneNumber,
  //     dto.code,
  //   );

  //   if (verificationCheckInstance.status !== 'approved')
  //     throw new ForbiddenException('Expired or incorrect code, try again.');

  //   let user: User;
  //   let access_token: string;
  //   let refresh_token: string;

  //   const transaction = await this.userModel.sequelize.transaction();

  //   try {
  //     user = await this.userModel.create(
  //       {
  //         ...signUpSession,
  //         verified_phone: true,
  //       },
  //       { transaction },
  //     );

  //     access_token = await this.jwtService.signAsync({
  //       sub: user.id,
  //       isCredentials: true,
  //     });

  //     refresh_token = await this.jwtService.signAsync(
  //       {
  //         sub: user.id,
  //         isCredentials: true,
  //       },
  //       {
  //         secret: this.configService.get(JWT_REFRESH_TOKEN_SECRET),
  //         expiresIn: this.configService.get(JWT_REFRESH_TOKEN_EXP, '7d'),
  //       },
  //     );

  //     const existingSession = await this.sessionModel.findOne({
  //       where: { userId: user.id },
  //       transaction,
  //     });

  //     const currentDevices = existingSession?.logged_in_devices || [];

  //     const deviceAlreadyExists = currentDevices.includes(IdeviceInfo.device);

  //     const updatedDevices = deviceAlreadyExists
  //       ? currentDevices
  //       : [...currentDevices, IdeviceInfo.device];

  //     await this.sessionModel.upsert(
  //       {
  //         userId: user.id,
  //         refresh_token,
  //         lastLoggedIn: new Date(),
  //         deviceIpAddress: IdeviceInfo.ip,
  //         deviceLastLoggedIn: IdeviceInfo.device,
  //         logged_in_devices: updatedDevices,
  //       },
  //       { transaction },
  //     );

  //     await transaction.commit();
  //   } catch (error) {
  //     console.error({ error });
  //     await transaction.rollback();
  //     throw error;
  //   }

  //   await this.cache.delete(SIGN_UP_SESSION(dto.sessionId));

  //   await this.cache.set(
  //     USER_SESSION(user.id),
  //     user.toJSON(),
  //     this.configService.get(JWT_REFRESH_TOKEN_EXP, TIME_IN.days[7]),
  //   );

  //   return { user, access_token, refresh_token };
  // }
}
