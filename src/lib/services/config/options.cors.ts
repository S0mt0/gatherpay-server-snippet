import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';

import { NODE_ENV, PORT } from '../../constants';

const config = new ConfigService();

/** Allowed production origins */
const prodOrigin = [
  'https://gatherpay-9abaa.ondigitalocean.app',
  'https://www.gatherpay-9abaa.ondigitalocean.app',
];

/** Allowed development origins */
const devOrigin = [
  `http://localhost:${config.get(PORT, 8000)}`,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  '::1',
];

const isProduction = config.get(NODE_ENV) === 'production';

const allowedOrigins = isProduction ? prodOrigin : devOrigin;

/** CORS config options */
export const corsOptions: CorsOptions = {
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Origin',
    'X-Requested-With',
    'Accept',
    'User-Agent',
    'Cookie',
  ],

  credentials: true,
  optionsSuccessStatus: 200,
  exposedHeaders: [
    'Content-Range',
    'X-Content-Range',
    'Set-Cookie',
    'Authorization',
  ],

  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  origin: (origin, callback) => {
    console.log('Incoming request origin:', origin);

    if (allowedOrigins.includes(origin!) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('NOT ALLOWED BY CORS'));
    }
  },
};
