import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  BelongsToMany,
} from 'sequelize-typescript';

import { Chat } from 'src/chats/models/chat.model';
import { BankDetail } from 'src/users/models';
import { UserGroup } from 'src/users/models/user-group.model';
import { User } from 'src/users/models/user.model';

@Table({ tableName: 'groups' })
export class Group extends Model<Group> {
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
  groupName: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  adminId: number;

  @BelongsTo(() => User)
  admin: User;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  max_number: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  description: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  bannerUrl: string;

  @Column({
    type: DataType.FLOAT,
    allowNull: false,
  })
  contributionGoal: number;

  @ForeignKey(() => BankDetail)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  defaultDepositAccountId: string;

  @BelongsTo(() => BankDetail, 'deposit_account')
  depositAccount: BankDetail;

  @BelongsToMany(() => User, () => UserGroup)
  members: User[];

  @HasMany(() => Chat)
  chats: Chat[];
}
