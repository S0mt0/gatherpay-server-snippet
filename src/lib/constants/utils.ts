import { AllowedProviders } from '../interface';
import { generateDays, generateHours, generateMinutes } from '../utils';

export const CACHE_INSTANCE = 'CACHE_INSTANCE';

/** Time in `minute`, ` hour` and `day` expressed in `milliseconds` */
export const TIME_IN = {
  /** Time in `minutes` expressed in `milliseconds` */
  minutes: generateMinutes(),
  /** Time in `hours` expressed in `milliseconds` */
  hours: generateHours(),
  /** Time in `days` expressed in `milliseconds` */
  days: generateDays(),
};

/** @constant refresh_token */
export const REFRESH_TOKEN = 'refresh_token';

/**
 * Two factor authentication (2FA) session Id
 * @description Specifically used in all `2FA` requests
 * @constant TFASID
 */
export const TFASID = 'TFASID';

/** Session Id's `ttl` (time to live) in milliseconds
 * @description Mostly influenced by Twilio verify's code `ttl`
 * @constant
 */
export const SID_TTL = TIME_IN.minutes[10];

/** Two factor authentication (2FA) session Id's `ttl` (time to live in milliseconds)
 * @constant
 */
export const TFASID_TTL = TIME_IN.minutes[15];

/**
 * Session Id
 * @description Session in the context of the app is mostly used to track short lived activities like `sign up`, `forget password` etc
 * @constant SID
 */
export const SID = 'SID';

export const APP_NAME = 'Gatherpay';

export const APP_VERSION = '1.0';

export const APP_DESCRIPTION =
  'GatherPay is a community-driven platform that allows members to contribute funds on scheduled basis, track contributions, access payouts, chat with fellow members, and achieve personal financial goals together.';

export const SUPPORTED_PROVIDERS: AllowedProviders[] = [
  'apple.com',
  'credentials',
  'facebook.com',
  'google.com',
];

export const PROFILE_IMGS_NAME_LIST = [
  'Garfield',
  'Tinkerbell',
  'Annie',
  'Loki',
  'Cleo',
  'Angel',
  'Bob',
  'Mia',
  'Coco',
  'Gracie',
  'Bear',
  'Bella',
  'Abby',
  'Harley',
  'Cali',
  'Leo',
  'Luna',
  'Jack',
  'Felix',
  'Kiki',
];

export const PROFILE_IMGS_COLLECTIONS_LIST = [
  'notionists-neutral',
  'adventurer-neutral',
  'fun-emoji',
];

export const BACKGROUND_IMGS_COLLECTIONS_LIST = ['identicons', 'shapes'];

export const BACKGROUND_IMGS_NAME_LIST = [
  'Sara',
  'Caleb',
  'Aiden',
  'Liliana',
  'Ryker',
  'Ryan',
  'Destiny',
  'Sarah',
  'Eden',
  'Sawyer',
  'Sadie',
  'Liam',
  'Caleb',
  'Emery',
  'Jameson',
];
