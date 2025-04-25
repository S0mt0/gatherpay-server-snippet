import { PickType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

import { CreateUserDto } from './create-user.dto';

export class UpdatePhoneNumberDto extends PickType(CreateUserDto, [
  'phoneNumber',
] as const) {}

export class ParseUserNotificationsQueryDto {
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  group_updates?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  payment_reminders?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  announcements?: boolean;
}

export class BankDetailsDto {
  @IsString({ message: '"bankName" is required' })
  @MinLength(3)
  bankName: string;

  @IsString({ message: '"accountNumber" is required' })
  @MinLength(5)
  accountNumber: string;

  @IsString()
  @IsOptional()
  @MinLength(3)
  accountName?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  bankSortCode?: string;
}

export class IdDto {
  @IsString({ message: '"id" is required' })
  id: string;
}
