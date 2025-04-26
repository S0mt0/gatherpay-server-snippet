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
  UpdateBankDetailDto,
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
    if (dto.phoneNumber !== undefined && user.provider === 'credentials')
      delete dto.phoneNumber; // Don't allow direct update of phone number for credentials users. There's a dedicated route for that where they'd be required to verify their new number

    await user.update(dto);

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

    await session.update({
      twoFactorEnabled: true,
      twoFactorLoggedIn: true,
      twoFactorSecret: temp_secret,
    });

    await this.cacheService.delete(USER_2FA(decrypted));

    return session;
  }

  async disable2FA(session: Session) {
    await session.update({
      twoFactorEnabled: false,
      twoFactorLoggedIn: false,
      twoFactorSecret: null,
    });
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
      await user.update({ password: dto.new_password }, { transaction });
      await session.update(
        { passwordLastChanged: new Date() },
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async handlePhoneNumberChange(dto: UpdatePhoneNumberDto, user: User) {
    const provider = user.provider;

    if (provider !== 'credentials') {
      await user.update({
        phoneNumber: dto.phoneNumber,
        phone_verified: false,
      });

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

    await user.update({ phoneNumber: phoneChangeSession.phoneNumber });
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
    const count = await this.bankDetailModel.count({
      where: { userId: user.id },
    });

    if (count >= 3) {
      throw new BadRequestException('You can only add up to 3 bank details');
    }
    const detailExists = await this.bankDetailModel.findOne({
      where: {
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        userId: user.id,
      },
    });

    if (detailExists)
      throw new ConflictException(
        'These details already exist, add a different one.',
      );

    const transaction = await user.sequelize.transaction();

    try {
      const bank_detail = await this.bankDetailModel.create(
        { ...dto, userId: user.id },
        {
          transaction,
        },
      );

      // Set as default if first bank detail
      if (count === 0 || !user.bankDetailId) {
        await user.update({ bankDetailId: bank_detail.id }, { transaction });
      }

      await transaction.commit();

      return { bank_detail };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async updateDefaultBankDetails({ id }: IdDto, user: User) {
    const bankDetail = await this.bankDetailModel.findOne({
      where: { id, userId: user.id },
    });

    if (!bankDetail) throw new NotFoundException('Bank detail not found');

    await user.update({ bankDetailId: bankDetail.id });
  }

  async getBankDetails(userId: string) {
    return await this.bankDetailModel.findAll({ where: { userId } });
  }

  async getSingleBankDetail(id: string, userId: string) {
    const bank_detail = await this.bankDetailModel.findOne({
      where: { id, userId },
    });
    return { bank_detail };
  }

  async updateBankDetail(id: string, dto: UpdateBankDetailDto, userId: string) {
    const bank_detail = await this.bankDetailModel.findOne({
      where: { id, userId },
    });

    if (!bank_detail) throw new NotFoundException('Bank detail not found');

    await bank_detail.update(dto);

    return { bank_detail };
  }

  async removeBankDetails(id: string, user: User) {
    const transaction = await user.sequelize.transaction();
    try {
      // 1. Find and verify the bank detail belongs to user
      const bankDetail = await this.bankDetailModel.findOne({
        where: { id, userId: user.id },
        transaction,
      });

      if (!bankDetail) {
        throw new NotFoundException('Bank detail not found');
      }

      // 2. Check if this is the current default bank detail
      const isDefault = user.bankDetailId === id;

      // 3. Delete the bank detail
      await bankDetail.destroy({ transaction });

      // 4. Handle default bank detail reassignment if needed
      if (isDefault) {
        // Get remaining bank details (excluding the one being deleted)
        const remainingDetails = await this.bankDetailModel.findAll({
          where: { userId: user.id },
          transaction,
          order: [['createdAt', 'ASC']],
          limit: 1,
        });

        const newDefaultId =
          remainingDetails.length > 0 ? remainingDetails[0].id : null;

        await user.update({ bankDetailId: newDefaultId }, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async deleteAccount(user: User) {
    await user.destroy();
  }

  async findUserWithRelations(userId: string) {
    return this.userModel.findOne({
      where: { id: userId },
      include: ['defaultBankDetail', 'allBankDetails', 'groups'],
    });
  }
}
