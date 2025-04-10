import { UnauthorizedException } from '@nestjs/common';
import {
  PROFILE_IMGS_COLLECTIONS_LIST,
  PROFILE_IMGS_NAME_LIST,
} from '../constants';
import { Days, Hours, Minutes, TimeInMilliseconds } from '../interface';
import { Request } from 'express';

/** Randomly generates image urls on https://api.dicebear.com */
export const getRandomAvatarUrl = () =>
  `https://api.dicebear.com/6.x/${PROFILE_IMGS_COLLECTIONS_LIST[Math.floor(Math.random() * PROFILE_IMGS_COLLECTIONS_LIST?.length)]}/svg?seed=${PROFILE_IMGS_NAME_LIST[Math.floor(Math.random() * PROFILE_IMGS_NAME_LIST?.length)]}`;

/**
 * Multiplies all the number arguments and returns their product
 * @param args Numbers
 * @returns Product of the passed in numbers
 */
export const multiply = (...args: number[]) => {
  if (args.length === 0) {
    return 0; // If no numbers are provided, return 0
  }

  return args.reduce(
    (accumulator, currentValue) => accumulator * currentValue,
    1,
  );
};

/** Generates and returns an object whose keys in number represent ***time*** in `hour` and values expressed in `milliseconds`
 * @description Ranges from 1 to 24 ***hours***
 */
export function generateHours(): TimeInMilliseconds<Hours> {
  const hours = {} as TimeInMilliseconds<Hours>;
  for (let i = 1; i <= 24; i++) {
    hours[i as keyof typeof hours] = i * 60 * 60 * 1000;
  }
  return hours;
}

/** Generates and returns an object whose keys in number represent ***time*** in `day` and values expressed in `milliseconds`
 * @description Ranges from 1 to 7 ***days***
 */
export function generateDays(): TimeInMilliseconds<Days> {
  const days = {} as TimeInMilliseconds<Days>;
  for (let i = 1; i <= 7; i++) {
    days[i as keyof typeof days] = i * 24 * 60 * 60 * 1000;
  }
  return days;
}

/** Generates and returns an object whose keys in number represent ***time*** in `minute` and values expressed in `milliseconds`
 * @description Ranges from 1 to 59 ***minutes***
 */
export function generateMinutes(): TimeInMilliseconds<Minutes> {
  const minutes = {} as TimeInMilliseconds<Minutes>;
  for (let i = 1; i <= 59; i++) {
    minutes[i as keyof typeof minutes] = i * 60 * 1000;
  }
  return minutes;
}

export function extractAuthHeader(req: Request) {
  const authorization =
    req.headers['authorization'] || (req.headers['Authorization'] as string);

  if (!authorization || !authorization.startsWith('Bearer '))
    throw new UnauthorizedException('Missing or invalid authorization header.');

  return authorization.split(' ')[1] as string;
}

export const obscurePhoneNumber = (phoneNumber: string) => {
  if (phoneNumber.length <= 4) return phoneNumber;

  const firstTwo = phoneNumber.slice(0, 2);
  const lastTwo = phoneNumber.slice(-2);
  const obscuredMiddle = '*'.repeat(phoneNumber.length - 4);

  return `${firstTwo}${obscuredMiddle}${lastTwo}`;
};

export function obscureEmail(email: string): string {
  const [localPart, domain] = email.split('@');

  if (!domain || localPart.length <= 3) {
    return email;
  }

  const firstTwo = localPart.slice(0, 2);
  const lastChar = localPart.slice(-1);
  const obscuredMiddle = '*'.repeat(Math.max(0, localPart.length - 3));

  return `${firstTwo}${obscuredMiddle}${lastChar}@${domain}`;
}
