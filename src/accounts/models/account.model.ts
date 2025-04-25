import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';

import { User } from 'src/users/models/user.model';

export const BANK_ACCOUNTS_TABLE = 'bank_details';

@Table({ tableName: BANK_ACCOUNTS_TABLE })
export class BankDetail extends Model<BankDetail> {
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
  bankName: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  accountNumber: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  accountName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  bankSortCode: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;
}
