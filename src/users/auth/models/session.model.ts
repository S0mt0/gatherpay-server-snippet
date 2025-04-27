import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  DefaultScope,
} from 'sequelize-typescript';

import { User } from '../../models/user.model';

export const SESSIONS_TABLE = 'sessions';

@DefaultScope(() => ({
  include: [
    {
      model: User.scope('limited'),
    },
  ],
}))
@Table({ tableName: SESSIONS_TABLE })
export class Session extends Model<Session> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    unique: true,
    defaultValue: DataType.UUIDV4,
  })
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  deviceLastLoggedIn: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastLoggedIn: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  passwordLastChanged: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  refresh_token: string;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true,
  })
  loggedInDevices: string[];

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  deviceIpAddress: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  twoFactorSecret: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  twoFactorEnabled: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  twoFactorLoggedIn: boolean;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true,
  })
  userId: string;

  @BelongsTo(() => User)
  user: User;

  toJSON() {
    const session = super.toJSON();

    delete session.twoFactorSecret;
    delete session.refresh_token;
    delete session.userId;
    delete session.createdAt;
    delete session.updatedAt;

    return session;
  }
}
