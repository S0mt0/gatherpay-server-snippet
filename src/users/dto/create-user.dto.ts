import {
  IsString,
  IsBoolean,
  MinLength,
  IsStrongPassword,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  IsOptional,
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
    if (!value || typeof value !== 'string') return false;

    const parsedNumber = parsePhoneNumberFromString(value);
    if (!parsedNumber) return false;

    const countryCode = parsedNumber.country;
    return countryCode === 'NG' || countryCode === 'GB';
  }
}

export class CreateUserDto {
  @IsString({ message: '"firstName" is required' })
  @MinLength(3)
  firstName: string;

  @IsString({ message: '"lastName" is required' })
  @MinLength(3)
  lastName: string;

  /**
   * Presently, only UK (GB) and Nigeria (NG) phone numbers are supported. All phone numbers must be prefixed with their respective country phone codes, otherwise phone number validation fails.
   * @example +234 814 869 6119
   */
  @IsString({ message: '"phoneNumber" is required' })
  @Validate(IsAllowedRegionPhoneNumberConstraint, {
    message: 'Phone number is not valid or supported',
  })
  phoneNumber: string;

  @IsBoolean({
    message: 'Please accept our terms of service to continue',
  })
  @Validate(IsTrueConstraint, {
    message: 'Please accept our terms of service to continue',
  })
  terms_of_service: boolean;

  @IsStrongPassword({ minLength: 6 })
  password: string;

  @IsString({ message: '"confirm_password" is required' })
  confirm_password: string;

  /**
   * Validation for supported countries is not yet implemented, so it'll be done using phone numbers for now.
   */
  @IsOptional()
  @IsString()
  country: string;
}
