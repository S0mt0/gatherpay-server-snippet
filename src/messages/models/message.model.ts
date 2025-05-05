import { UnprocessableEntityException } from '@nestjs/common';
import {
  BeforeSave,
  BelongsTo,
  Column,
  DataType,
  DefaultScope,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Group } from 'src/groups/models';
import { User } from 'src/users/models';

export const MESSAGES_TABLE = 'messages';

@DefaultScope(() => ({
  include: {
    model: User.scope('limited'),
  },
}))
@Table({
  tableName: MESSAGES_TABLE,
  timestamps: true,
  createdAt: 'timestamp',
})
export class Message extends Model<Message> {
  @Column({
    primaryKey: true,
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    unique: true,
    allowNull: false,
  })
  id: string;

  @ForeignKey(() => Group)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  groupId: string;

  @BelongsTo(() => Group)
  group: Group;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  senderId: string;

  @BelongsTo(() => User)
  sender: User;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  receiverId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  text: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  file: string;

  @BeforeSave
  static ensureNonEmptyMessage(message: Message) {
    if (!message.text.trim().length && !message.file.trim().length)
      throw new UnprocessableEntityException('Message content cannot be empty');
  }
}
