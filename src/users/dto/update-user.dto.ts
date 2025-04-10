import { OmitType, PartialType } from '@nestjs/mapped-types';

import { CreateUserDto } from '../auth/dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['terms_of_service'] as const),
) {}
