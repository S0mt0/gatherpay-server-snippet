import {
  BeforeSave,
  BeforeUpdate,
  Column,
  DataType,
  Index,
  Model,
  Table,
} from 'sequelize-typescript';
import argon from 'argon2';

@Table({
  timestamps: true,
  createdAt: 'joinedAt',
})
export class User extends Model {
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
    allowNull: true,
  })
  password: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  @Index
  readonly email: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true, allowNull: false })
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
    if (user.changed('email')) {
      throw new Error('Email change is not allowed.');
    }
  }

  toJSON() {
    const user = super.toJSON();

    delete user.password;
    delete user.refresh_token;
    delete user.terms_of_service;

    return user;
  }
}
