import { Transform } from 'class-transformer';
import { IsString, IsInt, Min, IsOptional, IsIn } from 'class-validator';

import { TGroupRole } from 'src/lib/interface';

export class ParseGroupUrlQueryDto {
  @IsString()
  @IsOptional()
  @IsIn(['admin', 'member'])
  role?: TGroupRole;

  @IsInt()
  @Min(1, { message: 'Page must be at least 1' })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  page?: number = 1;

  @IsInt()
  @Min(1, { message: 'Limit must be at least 1' })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 10))
  limit?: number = 10;
}
