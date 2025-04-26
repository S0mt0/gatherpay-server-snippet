import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';

import { User } from './user.model';

export const BANK_DETAILS_TABLE = 'bank_details';

@Table({
  tableName: BANK_DETAILS_TABLE,
  indexes: [
    {
      name: 'unique_bankName_accountNumber_combo',
      unique: true,
      fields: ['bankName', 'accountNumber'],
    },
  ],
})
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

  @BelongsTo(() => User)
  owner: User;

  toJSON() {
    const bank = super.toJSON();

    delete bank.userId;

    return bank;
  }
}
