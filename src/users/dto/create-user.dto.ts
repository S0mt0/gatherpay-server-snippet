import {
  IsString,
  IsEmail,
  IsBoolean,
  IsOptional,
  MinLength,
  IsStrongPassword,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  firstName: string;

  @IsString()
  @MinLength(3)
  lastName: string;

  @IsEmail({}, { message: 'Invalid email' })
  email: string;

  @IsBoolean({
    message: 'Please accept our terms of service to continue.',
  })
  terms_of_service: boolean;

  @IsOptional()
  @IsStrongPassword({ minLength: 6 })
  password?: string;
}
