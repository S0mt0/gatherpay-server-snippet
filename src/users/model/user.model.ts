import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  ForeignKey,
  BelongsTo,
  BeforeSave,
  BeforeUpdate,
  HasOne,
} from 'sequelize-typescript';
import * as argon from 'argon2';
import { BadRequestException, ConflictException } from '@nestjs/common';

import { getRandomAvatarUrl } from 'src/lib/utils';

import { Session } from '../auth/models/session.model';
import { AccountDetail } from 'src/accounts/models/account.model';
import { Group } from 'src/groups/models/group.model';

@Table({ tableName: 'users', timestamps: true, createdAt: 'joinedAt' })
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
    allowNull: false,
  })
  firstName: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  lastName: string;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: true,
    validate: {
      isUnique: async (value: string) => {
        if (value === null) return;
        const user = await User.findOne({ where: { phoneNumber: value } });
        if (user) {
          throw new ConflictException('Phone number already in use.');
        }
      },
    },
  })
  phoneNumber: string;

  @Column({
    type: DataType.ENUM('credentials', 'google'),
    defaultValue: 'credentials',
  })
  auth_method: string;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: true,
    validate: {
      isEmail: { msg: 'Invalid email' },
      isUnique: async (value: string) => {
        if (value === null) return;
        const user = await User.findOne({ where: { email: value } });
        if (user) {
          throw new ConflictException('Email already in use.');
        }
      },
    },
  })
  email: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: function () {
      return `${this.firstName} ${this.lastName}`;
    },
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
  verified_phone: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  verified_kyc: boolean;

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

  @BelongsTo(() => AccountDetail, 'default_account')
  defaultAccount: AccountDetail;

  @HasMany(() => AccountDetail)
  accounts: AccountDetail[];

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  country: string;

  @HasMany(() => Group)
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
    return await argon.verify(password, this.password);
  }

  @BeforeSave
  static async hashPassword(user: User) {
    if (user.password) {
      user.password = await argon.hash(user.password);
    }
  }

  @BeforeUpdate
  static async enforceUserEmailChangePolicy(user: User) {
    if (user.changed('auth_method')) {
      throw new Error('Method of registration cannot be changed');
    }
  }

  toJSON() {
    const user = super.toJSON();

    delete user.password;
    delete user.terms_of_service;
    delete user.default_account_id;
    delete user.auth_method;
    delete user.updatedAt;

    return user;
  }
}
