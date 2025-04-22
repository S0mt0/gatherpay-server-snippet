import { UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto-js';

import {
  JWT_ACCESS_TOKEN_SECRET,
  PROFILE_IMGS_COLLECTIONS_LIST,
  PROFILE_IMGS_NAME_LIST,
} from '../constants';
import { Days, Hours, Minutes, TimeInMilliseconds } from '../interface';
import { ConfigService } from '@nestjs/config';

const config = new ConfigService();

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

export function extractBearerToken(req: Request) {
  const authorization = req.headers['authorization'];

  if (!authorization || !authorization.startsWith('Bearer '))
    throw new UnauthorizedException('Missing valid bearer token');

  return authorization.split(' ')[1];
}

export const obscurePhoneNumber = (phoneNumber: string) => {
  if (phoneNumber.length <= 10) return phoneNumber;

  const firstTwo = phoneNumber.slice(0, 7);
  const lastTwo = phoneNumber.slice(-4);
  const obscuredMiddle = '*'.repeat(phoneNumber.length - 10);

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

export const encrypt = (
  data: any,
  secret: string = config.get(JWT_ACCESS_TOKEN_SECRET),
) => crypto.AES.encrypt(JSON.stringify(data), secret).toString();

export const decrypt = (
  ciphertext: string,
  secret: string = config.get(JWT_ACCESS_TOKEN_SECRET),
) => {
  const bytes = crypto.AES.decrypt(ciphertext, secret);

  try {
    return JSON.parse(bytes.toString(crypto.enc.Utf8));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return bytes.toString(crypto.enc.Utf8);
  }
};

export const getExampleResponseObject = ({
  statusCode = 200,
  data = {},
}: {
  statusCode?: number;
  data?: object;
}) => {
  if ((Array.isArray(data) && data.length) || Object.keys(data).length)
    return {
      statusCode,
      message: 'Success',
      data,
      timestamp: '2025-04-14T13:47:23.456Z',
    };

  return {
    statusCode,
    message: 'Success',
    timestamp: '2025-04-14T13:47:23.456Z',
  };
};
