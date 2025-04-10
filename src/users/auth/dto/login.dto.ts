import { IsString } from 'class-validator';

export class LoginUserDto {
  @IsString()
  phoneNumber: string;

  @IsString()
  password: string;
}
