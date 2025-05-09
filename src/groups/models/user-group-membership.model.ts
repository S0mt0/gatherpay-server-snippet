import {
  Table,
  Column,
  Model,
  ForeignKey,
  DataType,
  BelongsTo,
  Scopes,
} from 'sequelize-typescript';

import { Group } from 'src/groups/models/group.model';
import { TGroupMembershipStatus, TGroupRole } from 'src/lib/interface';
import { User } from 'src/users/models';

export const USER_GROUP_TABLE = 'user_group_memberships';

@Scopes(() => ({
  public: {
    include: [
      {
        model: User.scope('profile'),
      },
    ],
    attributes: ['status', 'role', 'memberSince', 'payoutOrder'],
  },
}))
@Table({
  tableName: USER_GROUP_TABLE,
  timestamps: true,
  indexes: [
    {
      unique: true,
      name: 'unique_group_payoutOrder_combo',
      fields: ['id', 'payoutOrder'], // No two users in the same group should have the same payoutOrder. They each should receive payouts on different times
    },
  ],
})
export class UserGroupMembership extends Model<UserGroupMembership> {
  @Column({
    type: DataType.UUID,
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
  memberId: string;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Group)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  groupId: string;

  @BelongsTo(() => Group)
  groupInfo: Group;

  @Column({
    type: DataType.ENUM<TGroupRole>('admin', 'member'),
    defaultValue: 'member',
  })
  role: TGroupRole;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  payoutOrder: number; // Note to self: Remember, admin should get the last payout.

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  memberSince: Date;

  toJSON() {
    const member = super.toJSON();

    delete member.id;
    delete member.memberId;
    delete member.createdAt;
    delete member.updatedAt;

    return member;
  }
}
