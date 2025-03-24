import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';

import { Chat } from 'src/chats/models/chat.model';
import { User } from 'src/users/model/user.model';

@Table({ tableName: 'groups' })
export class Group extends Model<Group> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  groupName: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
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

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  accountToPayContribution: string;

  @HasMany(() => Chat)
  chats: Chat[];
}
