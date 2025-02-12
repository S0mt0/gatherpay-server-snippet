import {
  IsString,
  IsEmail,
  IsBoolean,
  IsOptional,
  MinLength,
  IsStrongPassword,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsTrue', async: false })
export class IsTrueConstraint implements ValidatorConstraintInterface {
  validate(value: boolean) {
    return value === true;
  }
}

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  firstName: string;

  @IsString()
  @MinLength(3)
  lastName: string;

  @IsEmail({}, { message: 'Invalid email' })
  email: string;

  @IsBoolean({
    message: 'Please accept our terms of service to continue.',
  })
  @Validate(IsTrueConstraint, {
    message: 'Please accept our terms of service to continue.',
  })
  terms_of_service: boolean;

  @IsOptional()
  @IsStrongPassword({ minLength: 6 })
  password?: string;
}
