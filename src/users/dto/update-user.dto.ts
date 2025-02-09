import { OmitType } from '@nestjs/mapped-types';

import { CreateUserDto } from './create-user.dto';

export class UpdateCatDto extends OmitType(CreateUserDto, [
  'terms_of_service',
  'email',
] as const) {}
