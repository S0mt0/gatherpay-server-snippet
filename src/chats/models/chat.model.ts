import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Group } from 'src/groups/models/group.model';

import { User } from 'src/users/models/user.model';

@Table({ tableName: 'chats' })
export class Chat extends Model<Chat> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    unique: true,
    defaultValue: DataType.UUIDV4,
  })
  readonly id!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  message: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  senderId: string;

  @BelongsTo(() => User)
  sender: User;

  @ForeignKey(() => Group)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  groupId: string;

  @BelongsTo(() => Group)
  group: Group;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  timestamp: Date;
}
