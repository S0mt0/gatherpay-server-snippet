import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';

import { User } from '../../models/user.model';

@Table({ tableName: 'sessions' })
export class Session extends Model<Session> {
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
    type: DataType.STRING,
    allowNull: true,
  })
  refresh_token: string;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true,
  })
  logged_in_devices: string[];

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  deviceIpAddress: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  twoFactorEnabled: boolean;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true,
  })
  userId: string;

  @BelongsTo(() => User)
  user: User;
}
