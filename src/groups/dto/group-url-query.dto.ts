import { Transform } from 'class-transformer';
import { IsString, IsInt, Min, IsOptional, IsIn } from 'class-validator';

import { TGroupPayoutDay, TGroupStatus } from 'src/lib/interface';

type SortOptions = 'createdAt' | '-createdAt' | 'updatedAt' | '-updatedAt';

export class ParseGroupUrlQueryDto {
  @IsString()
  @IsOptional()
  @IsIn(['createdAt', '-createdAt', 'updatedAt', '-updatedAt'])
  @Transform(({ value }) => (value !== undefined ? value : '-createdAt'))
  sort?: SortOptions = '-createdAt';

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @IsIn([
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ])
  payoutDay?: TGroupPayoutDay;

  @IsString()
  @IsOptional()
  @IsIn(['pending', 'active', 'completed', 'cancelled'])
  status?: TGroupStatus;

  @IsString()
  @IsOptional()
  fields?: string;

  @IsInt()
  @Min(1, { message: 'Page must be at least 1' })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  page: number = 1;

  @IsInt()
  @Min(1, { message: 'Limit must be at least 1' })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 10))
  limit: number = 10;
}
