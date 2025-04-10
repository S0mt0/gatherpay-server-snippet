import { Sequelize } from 'sequelize-typescript';
import { InjectModel } from '@nestjs/sequelize';
import {
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
  REFRESH_TOKEN,
  TIME_IN,
  SESSION_USER,
  SIGN_UP_SESSION,
  PASSWORD_SESSION,
} from 'src/lib/constants';
import { CacheService } from 'src/lib/services/cache/cache.service';

import { LoginUserDto, NewPasswordDto, CodeDto } from './dto';
import { ForgotPasswordDto } from './dto';
import { CreateUserDto } from './dto';
import { User } from '../models/user.model';
import { TwilioService } from 'src/lib/services';
import { obscurePhoneNumber } from 'src/lib/utils';
import { Session } from './models/session.model';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private cache: CacheService,
    private twilio: TwilioService,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Session) private sessionModel: typeof Session,
    private sequelize: Sequelize,
  ) {}

  async signUp(dto: CreateUserDto) {
    if (dto.password !== dto.confirm_password)
      throw new UnprocessableEntityException('Passwords do not match.');

    const signUpSession = await this.cache.get<CreateUserDto>(
      SIGN_UP_SESSION(dto.phoneNumber),
    );

    if (signUpSession)
      throw new ConflictException(
        `Phone number already in use. Please verify account with the code sent to ${obscurePhoneNumber(dto.phoneNumber)}`,
      );

    console.log({ signUpSession });

    const userExists = await this.userModel.findOne({
      where: {
        phoneNumber: dto.phoneNumber,
      },
    });

    if (userExists && userExists.verified_phone)
      throw new ConflictException('Phone number already in use, try again.');

    if (userExists && !userExists.verified_phone)
      throw new ConflictException(
        `Phone number already in use. Please verify account with the code sent to ${obscurePhoneNumber(dto.phoneNumber)}`,
      );

    const verificationInstance = await this.twilio.createVerifyCode(
      dto.phoneNumber,
    );

    console.log({ verificationInstance });

    if (verificationInstance.status === 'approved') {
      const cached = await this.cache.set(
        SIGN_UP_SESSION(dto.phoneNumber),
        dto,
        TIME_IN.days[7], // Instead of saving user to actual remote database, thereby using up space, let the user info be stored in cache and automatically deletes after 1 week of not verifying their phone number.
      );

      console.log({ cached });
    }

    const token = this.jwtService.signAsync(
      { sub: dto.phoneNumber },
      { expiresIn: '7d' },
    );

    return {
      token,
      message: `Verify your account with the code sent to ${obscurePhoneNumber(dto.phoneNumber)}`,
    };
  }

  async resendSignUpVerificationCode(jwt: string) {
    const decoded = await this.jwtService.verifyAsync<{ sub: string }>(jwt);

    if (!decoded)
      throw new UnauthorizedException('Session expired, try again.');

    const signUpSession = await this.cache.get<CreateUserDto>(
      SIGN_UP_SESSION(decoded.sub),
    );

    if (!signUpSession)
      throw new UnauthorizedException(
        'Account does not exist, please sign up.',
      );

    const verificationInstance = await this.twilio.createVerifyCode(
      signUpSession.phoneNumber,
    );

    if (verificationInstance.status === 'approved') {
      await this.cache.set(
        SIGN_UP_SESSION(signUpSession.phoneNumber),
        signUpSession,
        TIME_IN.days[7],
      );
    }

    const token = this.jwtService.signAsync({ sub: signUpSession.phoneNumber });

    return {
      token,
      message: `A code has been sent to ${obscurePhoneNumber(signUpSession.phoneNumber)}`,
    };
  }

  async verifyAccount(dto: CodeDto, jwt: string) {
    const decoded = await this.jwtService.verifyAsync<{ sub: string }>(jwt);

    if (!decoded)
      throw new UnauthorizedException('Session expired, try again.');

    const signUpSession = await this.cache.get<CreateUserDto>(
      SIGN_UP_SESSION(decoded.sub),
    );

    if (!signUpSession)
      throw new UnauthorizedException(
        'Account does not exist, please sign up.',
      );

    console.log({ signUpSession });

    const verificationCheckInstance = await this.twilio.createVerificationCheck(
      signUpSession.phoneNumber,
      dto.code,
    );

    console.log({ verificationCheckInstance });

    if (verificationCheckInstance.status === 'failed')
      throw new ForbiddenException('Invalid code!');

    if (verificationCheckInstance.status === 'approved') {
      await this.userModel.create({ ...signUpSession, verified_phone: true });

      await this.cache.delete(SIGN_UP_SESSION(signUpSession.phoneNumber));
    }

    return 'You rock!🎉 Please login now!';
  }

  async login(dto: LoginUserDto) {
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

    const access_token = await this.jwtService.signAsync({
      sub: user.id,
      isCredentials: true,
    });

    const refresh_token = await this.jwtService.signAsync(
      {
        sub: user.id,
        isCredentials: true,
      },
      {
        secret: this.configService.get(JWT_REFRESH_TOKEN_SECRET),
        expiresIn: this.configService.get(JWT_REFRESH_TOKEN_EXP, '7d'),
      },
    );

    await this.sequelize.transaction(async (t) => {
      user.refresh_token = refresh_token;
      await user.save({ transaction: t });

      await this.sessionModel.upsert(
        { refresh_token },
        {
          transaction: t,
        },
      );
    });

    await this.cache.set(
      SESSION_USER(user.id),
      user.toJSON(),
      this.configService.get(JWT_REFRESH_TOKEN_EXP, TIME_IN.days[7]),
    );

    await this.cache.set(
      REFRESH_TOKEN(user.id),
      refresh_token,
      this.configService.get(JWT_REFRESH_TOKEN_EXP, TIME_IN.days[7]),
    );

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

    if (verificationInstance.status === 'approved') {
      await this.cache.set(
        PASSWORD_SESSION(dto.phoneNumber),
        dto,
        TIME_IN.days[7],
      );
    }

    const token = this.jwtService.signAsync(
      { sub: dto.phoneNumber },
      { expiresIn: '7d' },
    );

    return {
      token,
      message: `A code was sent to ${obscurePhoneNumber(dto.phoneNumber)}`,
    };
  };

  resendPasswordResetCode = async (jwt: string) => {
    const decoded = await this.jwtService.verifyAsync<{ sub: string }>(jwt);

    if (!decoded)
      throw new UnauthorizedException('Session expired, try again.');

    return this.forgotPassword({ phoneNumber: decoded.sub });
  };

  async verifyPasswordResetCode(dto: CodeDto, jwt: string) {
    const decoded = await this.jwtService.verifyAsync<{ sub: string }>(jwt);

    if (!decoded)
      throw new UnauthorizedException('Session expired, try again.');

    const passwordSession = await this.cache.get<ForgotPasswordDto>(
      PASSWORD_SESSION(decoded.sub),
    );

    if (!passwordSession) throw new UnauthorizedException();

    const verificationCheckInstance = await this.twilio.createVerificationCheck(
      passwordSession.phoneNumber,
      dto.code,
    );

    if (verificationCheckInstance.status === 'failed')
      throw new ForbiddenException('Invalid code!');

    if (verificationCheckInstance.status === 'approved')
      await this.cache.delete(PASSWORD_SESSION(passwordSession.phoneNumber));

    const token = await this.jwtService.signAsync(
      {
        sub: passwordSession.phoneNumber,
      },
      { expiresIn: '7d' },
    );

    return token;
  }

  async resetPassword(dto: NewPasswordDto, jwt: string) {
    const decoded = await this.jwtService.verifyAsync<{ sub: string }>(jwt);

    if (!decoded)
      throw new UnauthorizedException('Session expired, try again.');

    const user = await this.userModel.findOne({
      where: { phoneNumber: decoded.sub },
    });

    if (!user) throw new UnauthorizedException('User not found');

    if (dto.new_password !== dto.confirm_password)
      throw new ForbiddenException('Passwords do not match');

    user.password = dto.new_password;
    await user.save();

    return 'Voila! Your password has been updated🥳';
  }

  refreshToken = async (refresh_token: string) => {
    const user = await this.userModel.findOne({ where: { refresh_token } });

    if (!user)
      throw new UnauthorizedException('Session expired, please log in again.');

    const token = await this.jwtService.signAsync({
      sub: user.id,
    });

    return { user, token };
  };

  async logout(refresh_token: string) {
    // Is refresh_token in db?
    const user = await this.userModel.findOne({ where: { refresh_token } });
    if (!user) throw new UnauthorizedException();

    await this.sequelize.transaction(async (t) => {
      user.refresh_token = '';
      await user.save({ transaction: t });

      await this.sessionModel.update(
        { refresh_token: '' },
        {
          where: { userId: user.id },
          transaction: t,
        },
      );
    });
  }
}
