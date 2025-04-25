import { PartialType, OmitType } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, [
    'confirm_password',
    'password',
    'terms_of_service',
  ] as const),
) {
  @IsOptional()
  @IsEmail()
  @MinLength(3)
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  username: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  bio: string;

  @IsOptional()
  @IsString()
  picture: string;
}
