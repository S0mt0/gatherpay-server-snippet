import { IsString } from 'class-validator';

export class LoginUserDto {
  @IsString({ message: '"phoneNumber" is required' })
  phoneNumber: string;

  @IsString({ message: '"password" is required' })
  password: string;
}

export class OauthDto {
  @IsString({ message: '"idToken" is required' })
  idToken: string;
}
