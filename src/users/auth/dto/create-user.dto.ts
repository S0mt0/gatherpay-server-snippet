import {
  IsString,
  IsBoolean,
  MinLength,
  IsStrongPassword,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

@ValidatorConstraint({ name: 'IsTrue', async: false })
export class IsTrueConstraint implements ValidatorConstraintInterface {
  validate(value: boolean) {
    return value === true;
  }
}

@ValidatorConstraint({ name: 'IsAllowedRegionPhoneNumber', async: false })
export class IsAllowedRegionPhoneNumberConstraint
  implements ValidatorConstraintInterface
{
  validate(value: string) {
    const parsedNumber = parsePhoneNumberFromString(value);
    if (!parsedNumber) return false;

    const countryCode = parsedNumber.country;
    return countryCode === 'NG' || countryCode === 'GB';
  }
}

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  firstName: string;

  @IsString()
  @MinLength(3)
  lastName: string;

  @IsString()
  @Validate(IsAllowedRegionPhoneNumberConstraint, {
    message: 'Phone number is not valid or supported. Please try again.',
  })
  phoneNumber: string;

  @IsBoolean({
    message: 'Please accept our terms of service to continue.',
  })
  @Validate(IsTrueConstraint, {
    message: 'Please accept our terms of service to continue.',
  })
  terms_of_service: boolean;

  @IsStrongPassword({ minLength: 6 })
  password: string;

  @IsString()
  confirm_password: string;

  @IsString()
  country: string;
}
