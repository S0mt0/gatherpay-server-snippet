import { generateDays, generateHours, generateMinutes } from '../utils';

export const CACHE_INSTANCE = 'CACHE_INSTANCE';

/** @constant refresh_token */
export const REFRESH_TOKEN = 'refresh_token';

/**
 * Two factor authentication (2FA) session Id
 * @description Specifically used in all `2FA` requests
 * @constant s_2fa
 */
export const S_2FA = 's_2fa';

/**
 * Session Id
 * @description Session in the context of the app is mostly used to track short lived activities like `sign up`, `forget password` etc
 * @constant s_id
 */
export const S_ID = 's_id';

/** Time in `minute`, ` hour` and `day` expressed in `milliseconds` */
export const TIME_IN = {
  /** Time in `minutes` expressed in `milliseconds` */
  minutes: generateMinutes(),
  /** Time in `hours` expressed in `milliseconds` */
  hours: generateHours(),
  /** Time in `days` expressed in `milliseconds` */
  days: generateDays(),
};

export const APP_NAME = 'Gatherpay';

export const APP_VERSION = '1.0';

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
