import {
  Table,
  Column,
  Model,
  ForeignKey,
  DataType,
  BelongsTo,
} from 'sequelize-typescript';

import { Group } from 'src/groups/models/group.model';
import { TGroupUserDefaultReason } from 'src/lib/interface';
import { User } from 'src/users/models';

export const USER_DEFAULT_TABLE = 'user_defaults';

@Table({
  tableName: USER_DEFAULT_TABLE,
  timestamps: true,
  createdAt: 'reportedAt',
})
export class UserDefaultRecord extends Model<UserDefaultRecord> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  resolved: boolean;

  @Column({
    type: DataType.ENUM<TGroupUserDefaultReason>(
      'missed_contribution',
      'delayed_contribution',
      'disappeared_after_payout',
    ),
    allowNull: false,
  })
  reason: TGroupUserDefaultReason;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  reporterId: string;

  @BelongsTo(() => User)
  reporter: User;

  @ForeignKey(() => Group)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  groupId: string;

  @BelongsTo(() => Group)
  group: Group;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  cycleId: string;
}
