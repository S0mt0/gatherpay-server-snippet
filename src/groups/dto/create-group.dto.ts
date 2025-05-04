import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import {
  TGroupCustomFrequency,
  TGroupFrequency,
  TGroupPayoutDay,
  TGroupPayoutOrder,
  TGroupRole,
} from 'src/lib/interface';

class CustomFrequencyDto {
  @IsNumber()
  @Min(2, { message: 'Step must be at least 2' })
  @Max(10, { message: 'Step must be at most 10' })
  step: number;

  @IsIn(['days', 'weeks', 'months', 'years'], {
    message: 'Unit must be one of: days, weeks, months, years',
  })
  unit: TGroupCustomFrequency;
}

export class CreateGroupDto {
  @IsString({ message: 'Group "name" is required' })
  @MinLength(3)
  name: string;

  @IsString({ message: 'Group "description" is required' })
  @MaxLength(200)
  @MinLength(10)
  description: string;

  @IsOptional()
  @IsString()
  @IsIn(['admin', 'member'])
  holder: TGroupRole;

  @IsOptional()
  picture?: string;

  @IsNumber(
    { allowInfinity: false },
    { message: '"targetMemberCount" is required' },
  )
  @Max(100)
  @Min(3)
  targetMemberCount: number;

  @IsNumber(
    { allowInfinity: false },
    { message: '"contributionAmount" is required' },
  )
  contributionAmount: number;

  @IsString()
  @IsIn([
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ])
  payoutDay: TGroupPayoutDay;

  @IsOptional()
  @IsString()
  @IsIn(['random', 'first-come-first-serve'])
  payoutOrder?: TGroupPayoutOrder;

  @IsString()
  @IsIn(['daily', 'weekly', 'bi-weekly', 'monthly', 'custom'])
  frequency: TGroupFrequency;

  @ValidateIf((o) => o.frequency === 'custom')
  @ValidateNested()
  @Type(() => CustomFrequencyDto)
  customFrequency?: TGroupCustomFrequency;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  repeat?: boolean;

  @IsOptional()
  @IsBoolean()
  startImmediately?: boolean;

  @IsOptional()
  @IsString()
  defaultCurrency?: string;
}
