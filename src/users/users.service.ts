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
import { InjectModel } from '@nestjs/sequelize';
import * as QRCode from 'qrcode';

import { User } from './models/user.model';
import { AuthService } from './auth';
import { Session } from './auth/models';
import { CacheService, TwilioService } from 'src/lib/services';
import {
  SID_TTL,
  SIGN_UP_SESSION,
  TFASID_TTL,
  USER_2FA,
} from 'src/lib/constants';
import { decrypt, encrypt } from 'src/lib/utils';
import { CodeDto, UpdatePasswordDto } from './auth/dto';
import {
  BankDetailsDto,
  IdDto,
  ParseUserNotificationsQueryDto,
  UpdatePhoneNumberDto,
  UpdateUserDto,
} from './dto';
import { BankDetail } from './models';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(BankDetail) private bankDetailModel: typeof BankDetail,
    private readonly authService: AuthService,
    private readonly cacheService: CacheService,
    private readonly twilioService: TwilioService,
  ) {}

  async handleProfileUpdate(dto: UpdateUserDto, user: User) {
    const {
      bio,
      picture,
      username,
      country,
      firstName,
      lastName,
      email,
      phoneNumber,
    } = dto;

    if (bio !== undefined) user.bio = bio;
    if (picture !== undefined) user.picture = picture;
    if (country !== undefined) user.country = country;
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (username !== undefined) user.username = username;

    if (email !== undefined && user.provider === 'credentials')
      user.email = email;

    if (phoneNumber !== undefined && user.provider !== 'credentials')
      user.phoneNumber = phoneNumber;

    if (email !== undefined && user.provider !== 'credentials')
      throw new BadRequestException(
        'Email cannot be changed after registeration.',
      );

    await user.save();

    return user;
  }

  async enable2FA(user: User) {
    const { qrCode, secret: temp_secret } = this.authService.generate2FASecret(
      user.username,
    );

    await this.cacheService.set(USER_2FA(user.id), temp_secret, TFASID_TTL);

    const TFASID = encrypt(user.id);

    return {
      TFASID,
      qrCodeImageUrl: await QRCode.toDataURL(qrCode),
      temp_secret,
    };
  }

  async verify2FA(TFASID: string, dto: CodeDto, session: Session) {
    const decrypted = decrypt(TFASID);

    const temp_secret = await this.cacheService.get<string>(
      USER_2FA(decrypted),
    );

    if (!temp_secret)
      throw new ForbiddenException('Session expired, please try again.');

    const isValidated = this.authService.verify2FAToken(temp_secret, dto.code);

    if (!isValidated) throw new ForbiddenException('Invalid code');

    session.twoFactorEnabled = true;
    session.twoFactorSecret = temp_secret;
    session.twoFactorLoggedIn = true;
    await session.save();

    await this.cacheService.delete(USER_2FA(decrypted));

    return session;
  }

  async disable2FA(session: Session) {
    session.twoFactorEnabled = false;
    session.twoFactorLoggedIn = false;
    session.twoFactorSecret = null;
    await session.save();
  }

  async handlePasswordChange(
    dto: UpdatePasswordDto,
    user: User,
    session: Session,
  ) {
    const isValidCurrentPassword = await user.verifyPassword(
      dto.current_password,
    );

    if (!isValidCurrentPassword)
      throw new BadRequestException('Current password is incorrect');

    if (dto.new_password !== dto.confirm_password)
      throw new UnprocessableEntityException('Passwords do not match');

    const transaction = await user.sequelize.transaction();

    try {
      user.password = dto.new_password;
      session.passwordLastChanged = new Date();

      await user.save({ transaction });
      await session.save({ transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async handlePhoneNumberChange(dto: UpdatePhoneNumberDto, user: User) {
    const provider = user.provider;

    if (provider !== 'credentials') {
      user.phoneNumber = dto.phoneNumber;
      user.phone_verified = false;
      await user.save();

      return;
    }

    const verificationInstance = await this.twilioService.createVerifyCode(
      dto.phoneNumber,
    );

    if (verificationInstance.status !== 'pending')
      throw new BadGatewayException(
        'Error sending verification code, try again.',
      );

    const session = encrypt(dto.phoneNumber);

    await this.cacheService.set(SIGN_UP_SESSION(dto.phoneNumber), dto, SID_TTL);

    return session;
  }
  async verifyPhoneNumberChange(sessionId: string, dto: CodeDto, user: User) {
    const phoneChangeSession =
      await this.cacheService.get<UpdatePhoneNumberDto>(
        SIGN_UP_SESSION(decrypt(sessionId)),
      );

    if (!phoneChangeSession) {
      throw new UnauthorizedException(
        'Session expired, please register again!',
      );
    }

    const verificationCheckInstance =
      await this.twilioService.createVerificationCheck(
        phoneChangeSession.phoneNumber,
        dto.code,
      );

    if (verificationCheckInstance.status !== 'approved')
      throw new ForbiddenException('Expired or incorrect code, try again.');

    user.phoneNumber = phoneChangeSession.phoneNumber;
    await user.save();
  }

  async handleNotificationPreferences(
    query: ParseUserNotificationsQueryDto,
    user: User,
  ) {
    const { announcements, group_updates, payment_reminders } = query;

    if (announcements !== undefined) user.getAnnouncements = announcements;

    if (group_updates !== undefined) user.getGroupUpdates = group_updates;

    if (payment_reminders !== undefined)
      user.getPaymentReminders = payment_reminders;

    await user.save();
  }

  async addBankDetails(dto: BankDetailsDto, user: User) {
    const currentDetails = user.allBankDetails;

    if (currentDetails.length >= 3)
      throw new BadRequestException('You can only add up to 3 bank details');

    const detailExists = this.bankDetailModel.findOne({
      where: { bankName: dto.bankName, accountNumber: dto.accountNumber },
    });

    if (detailExists)
      throw new ConflictException(
        'These details already exist, add a different one.',
      );

    const transaction = await user.sequelize.transaction();
    try {
      const bank_detail = await this.bankDetailModel.create(dto, {
        transaction,
      });

      if (!currentDetails.length) user.bankDetailId = bank_detail.id;

      user.allBankDetails = [...currentDetails, bank_detail];
      await user.save({ transaction });

      return { bank_detail };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async handleDefaultBankDetailsUpdate({ id }: IdDto, user: User) {
    const bankDetail = await this.bankDetailModel.findByPk(id);

    if (!bankDetail) throw new NotFoundException('Bank detail not found');

    user.bankDetailId = bankDetail.id;
    await user.save();
  }

  async getBankDetails(userId: string) {
    return await this.bankDetailModel.findAll({ where: { userId } });
  }

  async getSingleBankDetail(id: string) {
    return await this.bankDetailModel.findByPk(id);
  }

  async removeBankDetails(id: string, user: User) {
    await this.bankDetailModel.destroy({ where: { id } });
    if (user.bankDetailId === id) user.bankDetailId = null;
  }

  async findUserWithRelations(userId: string) {
    return this.userModel.findOne({
      where: { id: userId },
      include: ['defaultBankDetail', 'allBankDetails', 'groups'],
    });
  }
}
