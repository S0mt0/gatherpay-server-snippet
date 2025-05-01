import {
  Table,
  Column,
  Model,
  ForeignKey,
  DataType,
  BelongsTo,
  DefaultScope,
} from 'sequelize-typescript';

import { Group } from 'src/groups/models/group.model';
import { TGroupMembershipStatus, TGroupRole } from 'src/lib/interface';
import { User } from 'src/users/models';

export const USER_GROUP_TABLE = 'user_group_memberships';

@DefaultScope(() => ({
  include: {
    model: User.scope('profile'),
  },
}))
@Table({
  tableName: USER_GROUP_TABLE,
  timestamps: true,
})
export class UserGroupMembership extends Model<UserGroupMembership> {
  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Column({
    type: DataType.ENUM<TGroupMembershipStatus>(
      'pending',
      'active',
      'suspended',
    ),
    defaultValue: 'pending',
  })
  status: TGroupMembershipStatus;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

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
    type: DataType.ENUM<TGroupRole>('admin', 'member'),
    defaultValue: 'member',
  })
  role: TGroupRole;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  payoutOrder: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  memberSince: Date;

  toJSON() {
    const member = super.toJSON();

    delete member.id;
    delete member.group;
    delete member.groupId;

    return member;
  }
}
