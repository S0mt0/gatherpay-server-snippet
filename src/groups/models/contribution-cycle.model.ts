import {
  Table,
  Column,
  Model,
  ForeignKey,
  DataType,
  BelongsTo,
} from 'sequelize-typescript';

import { Group } from 'src/groups/models/group.model';
import { TGroupCycleStatus } from 'src/lib/interface';
import { User } from 'src/users/models';

export const CONTRIBUTION_CYCLE_TABLE = 'contribution_cycles';

@Table({
  tableName: CONTRIBUTION_CYCLE_TABLE,
  timestamps: true,
})
export class ContributionCycle extends Model<ContributionCycle> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Column({
    type: DataType.ENUM<TGroupCycleStatus>('pending', 'completed', 'delayed'),
    defaultValue: 'pending',
  })
  status: TGroupCycleStatus;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  payoutUserId: string;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Group)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  groupId: string;

  @BelongsTo(() => Group)
  group: Group;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 1,
  })
  cycleNumber: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  payoutDate: Date;
}
