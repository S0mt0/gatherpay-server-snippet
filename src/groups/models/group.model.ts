import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
  HasMany,
  DefaultScope,
  HasOne,
  Scopes,
} from 'sequelize-typescript';

import { User } from 'src/users/models/user.model';
import { UserGroupMembership } from './user-group-membership.model';
import {
  TGroupCustomFrequency,
  TGroupFrequency,
  TGroupPayoutDay,
  TGroupPayoutOrder,
  TGroupRole,
  TGroupStatus,
} from 'src/lib/interface';
import { getRandomBackgroundImgUrl } from 'src/lib/utils';
import { Message } from 'src/messages/models';

export const GROUPS_TABLE = 'groups';

@DefaultScope(() => ({
  include: [
    {
      model: User.scope('limited'),
      as: 'members',
      through: {
        attributes: [],
      },
    },
  ],
}))
@Scopes(() => ({
  public: {
    include: { model: User.scope('limited'), as: 'owner' },
    attributes: [
      'id',
      'name',
      'picture',
      'status',
      'targetMemberCount',
      'contributionAmount',
      'defaultCurrency',
      'createdAt',
    ],
  },
}))
@Table({ tableName: GROUPS_TABLE, timestamps: true })
export class Group extends Model<Group> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: {
      name: 'name',
      msg: "Oops! That name is so cool, but it's been taken😉.",
    },
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  description: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: () => getRandomBackgroundImgUrl(),
  })
  picture: string;

  @ForeignKey(() => User) // Note to self:  Foreign key is actually pointing to user's primary key
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  ownerId: string; // This field might be used to directly fetch all groups created/owned by a user

  @BelongsTo(() => User)
  owner: User;

  @BelongsToMany(() => User, () => UserGroupMembership)
  members: User[];

  @HasOne(() => UserGroupMembership, { foreignKey: 'groupId' })
  ownerMembership: UserGroupMembership;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  targetMemberCount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  openSlots: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: false,
  })
  contributionAmount: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
  })
  defaultFee: number;

  @Column({
    type: DataType.ENUM('percentage', 'fiat'),
    allowNull: true,
  })
  defaultFeeUnit: 'percentage' | 'fiat';

  @Column({
    type: DataType.ENUM<TGroupRole>('admin', 'member'),
    defaultValue: 'admin',
  })
  holder: TGroupRole;

  @Column({
    type: DataType.ENUM<TGroupStatus>(
      'pending',
      'active',
      'completed',
      'cancelled',
    ),
    defaultValue: 'pending',
  })
  status: TGroupStatus;

  @Column({
    type: DataType.ENUM<TGroupPayoutDay>(
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ),
    defaultValue: 'friday',
  })
  payoutDay: TGroupPayoutDay;

  @Column({
    type: DataType.ENUM<TGroupFrequency>(
      'daily',
      'weekly',
      'bi-weekly',
      'monthly',
      'custom',
    ),
    defaultValue: 'daily',
  })
  frequency: TGroupFrequency;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {},
  })
  customFrequency: TGroupCustomFrequency;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  startImmediately: boolean;

  @Column({
    type: DataType.ENUM<TGroupPayoutOrder>('random', 'first-come-first-serve'),
    defaultValue: 'random',
  })
  payoutOrder: TGroupPayoutOrder;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  defaultCurrency: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  repeat: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isPublic: boolean;

  @HasMany(() => Message, { foreignKey: 'groupId' })
  messages: Message[];

  toJSON() {
    const group = super.toJSON();

    delete group.ownerId;
    delete group.ownerMembership;

    return group;
  }
}
