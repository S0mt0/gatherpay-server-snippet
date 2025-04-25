import { PickType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
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
