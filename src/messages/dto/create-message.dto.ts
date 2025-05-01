import { IsOptional, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsOptional()
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  file: string;

  @IsString({ message: '"senderId" is required' })
  senderId: string;

  @IsOptional()
  @IsString()
  receiverId: string;
}
