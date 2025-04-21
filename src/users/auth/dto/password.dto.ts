import { IsString, IsStrongPassword } from 'class-validator';

export class ForgotPasswordDto {
  @IsString({ message: '"phoneNumber" is required' })
  phoneNumber: string;
}

export class NewPasswordDto {
  @IsString({ message: '"confirm_password" is required' })
  confirm_password: string;

  @IsString({ message: '"new_password" is required' })
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
