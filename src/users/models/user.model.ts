import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  ForeignKey,
  BelongsTo,
  BeforeSave,
  HasOne,
  BelongsToMany,
  BeforeValidate,
} from 'sequelize-typescript';
import * as argon from 'argon2';
import { BadRequestException } from '@nestjs/common';

import { getRandomAvatarUrl } from 'src/lib/utils';

import { Session } from '../auth/models/session.model';
import { AccountDetail } from 'src/accounts/models/account.model';
import { Group } from 'src/groups/models/group.model';
import { UserGroup } from './user-group.model';
import { AllowedProviders } from 'src/lib/interface';

export const USERS_TABLE = 'users';

@Table({ tableName: USERS_TABLE, timestamps: true, createdAt: 'joinedAt' })
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
  firstName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  lastName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  socialId: string;

  @Column({
    type: DataType.STRING,
    unique: { name: 'phoneNumber', msg: 'Phone number taken, try again.' },
    allowNull: true,
  })
  phoneNumber: string;

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
    type: DataType.STRING,
    allowNull: false,
  })
  username: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  password: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  phone_verified: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  kyc_verified: boolean;

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
  avatarUrl: string;

  @ForeignKey(() => AccountDetail)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  default_account_id: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  country: string;

  @BelongsTo(() => AccountDetail, 'default_account')
  defaultAccount: AccountDetail;

  @HasMany(() => AccountDetail)
  accounts: AccountDetail[];

  @BelongsToMany(() => Group, () => UserGroup)
  groups: Group[];

  @HasOne(() => Session)
  session: Session;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    validate: {
      isTrue(value: boolean) {
        if (value !== true) {
          throw new BadRequestException('Please accept our terms of service.');
        }
      },
    },
  })
  terms_of_service: boolean;

  async verifyPassword(password: string): Promise<boolean> {
    if (!this.password) return false;

    return await argon.verify(this.password, password);
  }

  @BeforeSave
  static async hashPassword(user: User) {
    if (user.password) {
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

  toJSON() {
    const user = super.toJSON();

    delete user.password;
    delete user.terms_of_service;
    delete user.default_account_id;
    delete user.provider;
    delete user.updatedAt;

    return user;
  }
}
