import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  ForeignKey,
  BeforeSave,
  HasOne,
  BelongsToMany,
  BeforeValidate,
  BelongsTo,
  BeforeUpdate,
  DefaultScope,
  Scopes,
} from 'sequelize-typescript';
import * as argon from 'argon2';
import { UnprocessableEntityException } from '@nestjs/common';

import { getRandomAvatarUrl } from 'src/lib/utils';

import { Session } from '../auth/models/session.model';
import { Group } from 'src/groups/models/group.model';
import { UserGroup } from './user-group.model';
import { AllowedProviders } from 'src/lib/interface';
import { BankDetail } from './bank-detail.model';

export const USERS_TABLE = 'users';

@DefaultScope(() => ({
  include: [
    {
      model: BankDetail,
      as: 'defaultBankDetail',
      attributes: { exclude: ['id', 'userId'] },
    },
  ],
}))
@Scopes(() => ({
  limited: {
    attributes: ['id', 'provider', 'username'],
  },
}))
@Table({
  tableName: USERS_TABLE,
  timestamps: true,
  createdAt: 'joinedAt',
  paranoid: true,
})
export class User extends Model<User> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    unique: true,
    defaultValue: DataType.UUIDV4,
  })
  readonly id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  socialId: string;

  @Column({
    type: DataType.ENUM<AllowedProviders>(
      'credentials',
      'google.com',
      'facebook.com',
      'apple.com',
    ),
    defaultValue: 'credentials',
  })
  provider: AllowedProviders;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  firstName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  lastName: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  username: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  country: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  defaultCurrency: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: true,
  })
  bio: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: () => getRandomAvatarUrl(),
  })
  picture: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  password: string;

  @Column({
    type: DataType.STRING,
    unique: { name: 'phoneNumber', msg: 'Phone number taken, try again.' },
    allowNull: true,
  })
  phoneNumber: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  phone_verified: boolean;

  @Column({
    type: DataType.STRING,
    unique: { name: 'email', msg: 'Email taken, try again.' },
    allowNull: true,
    validate: {
      isEmail: { msg: 'Invalid email' },
    },
  })
  email: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  email_verified: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    validate: {
      isTrue(value: boolean) {
        if (value !== true) {
          throw new UnprocessableEntityException(
            'Please accept our terms of service.',
          );
        }
      },
    },
  })
  terms_of_service: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  kyc_verified: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  getPaymentReminders: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  getGroupUpdates: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  getAnnouncements: boolean;

  @ForeignKey(() => BankDetail)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  bankDetailId: string;

  @BelongsTo(() => BankDetail)
  defaultBankDetail: BankDetail;

  @HasMany(() => BankDetail)
  allBankDetails: BankDetail[];

  @BelongsToMany(() => Group, () => UserGroup)
  groups: Group[];

  @ForeignKey(() => Session)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  sessionId: string;

  @HasOne(() => Session)
  session: Session;

  async verifyPassword(password: string) {
    if (!this.password) return false;

    return await argon.verify(this.password, password);
  }

  @BeforeSave
  static async hashPassword(user: User) {
    if (user.changed('password')) {
      user.password = await argon.hash(user.password);
    }
  }

  @BeforeValidate
  static setUsername(user: User) {
    if (
      !user.username &&
      user.provider === 'credentials' &&
      user.firstName &&
      user.lastName
    ) {
      user.username = `${user.firstName} ${user.lastName}`;
    }

    if (!user.username && user.provider !== 'credentials' && user.email) {
      user.username = user.email.split('@')[0];
    }
  }

  @BeforeUpdate
  static async enforceUserEmailChangePolicy(user: User) {
    if (user.provider !== 'credentials' && user.changed('email')) {
      throw new UnprocessableEntityException(
        'Email cannot be changed after registeration.',
      );
    }
  }

  @BeforeUpdate
  static async enforceUserProviderChangePolicy(user: User) {
    if (user.changed('provider')) {
      throw new UnprocessableEntityException(
        'Method of registration cannot be changed',
      );
    }
  }

  toJSON() {
    const user = super.toJSON();

    delete user.password;
    delete user.terms_of_service;
    delete user.bankDetailId;
    delete user.updatedAt;
    delete user.sessionId;
    delete user.deletedAt;

    return user;
  }
}
