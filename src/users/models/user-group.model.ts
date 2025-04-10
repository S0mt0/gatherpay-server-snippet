import {
  Table,
  Column,
  Model,
  ForeignKey,
  DataType,
} from 'sequelize-typescript';

import { User } from './user.model';
import { Group } from 'src/groups/models/group.model';

@Table({ tableName: 'user_groups' })
export class UserGroup extends Model<UserGroup> {
  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: number;

  @ForeignKey(() => Group)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  groupId: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  joinedAt: Date;
}
