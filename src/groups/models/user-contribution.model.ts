import {
  Table,
  Column,
  Model,
  ForeignKey,
  DataType,
  BelongsTo,
} from 'sequelize-typescript';

import { Group } from 'src/groups/models/group.model';
import { TGroupUserContributionStatus } from 'src/lib/interface';
import { User } from 'src/users/models';

export const USER_CONTRIBUTION_TABLE = 'user_contributions';

@Table({
  tableName: USER_CONTRIBUTION_TABLE,
  timestamps: true,
})
export class UserContribution extends Model<UserContribution> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Column({
    type: DataType.FLOAT,
    allowNull: false,
  })
  amount: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  currency: number;

  @Column({
    type: DataType.ENUM<TGroupUserContributionStatus>(
      'paid',
      'not_paid',
      'not_confirmed',
    ),
    defaultValue: 'not_paid',
  })
  status: TGroupUserContributionStatus;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  contributorId: string;

  @BelongsTo(() => User)
  contributor: User;

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

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  paidAt: Date;
}
