import { IsString, IsStrongPassword } from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  phoneNumber: string;
}

export class NewPasswordDto {
  @IsString()
  confirm_password: string;

  @IsString()
  @IsStrongPassword({ minLength: 6 }, { message: 'Password not strong enough' })
  new_password: string;
}

export class UpdatePasswordDto {
  @IsString()
  current_password: string;

  @IsString()
  confirm_password: string;

  @IsString()
  @IsStrongPassword({ minLength: 6 }, { message: 'Password not strong enough' })
  new_password: string;
}
