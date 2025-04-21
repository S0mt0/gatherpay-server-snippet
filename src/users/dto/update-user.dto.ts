import { PartialType, PickType } from '@nestjs/swagger';

import { CreateUserDto } from '../auth/dto';

export class UpdateUserDto extends PartialType(
  PickType(CreateUserDto, ['phoneNumber'] as const),
) {}
