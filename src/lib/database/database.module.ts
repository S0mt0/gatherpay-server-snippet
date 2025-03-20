import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';

import { DatabaseService } from './database.service';
import { DATABASE_URL, NODE_ENV } from '../constants';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const isProduction =
          configService.get<string>(NODE_ENV) === 'production';

        const sslOptions = isProduction
          ? { require: true, rejectUnauthorized: true }
          : {};

        return {
          dialect: 'postgres',
          uri: configService.get(DATABASE_URL),
          autoLoadModels: true,
          synchronize: !isProduction, // In production, use migrations instead
          logging: !isProduction ? console.log : false,

          dialectOptions: {
            statement_timeout: 30000,
            idle_in_transaction_session_timeout: 10000,
            ...sslOptions,
          },

          pool: {
            max: 10,
            min: 1,
            acquire: 30000,
            idle: 10000,
          },

          timezone: 'UTC',
        };
      },
    }),
  ],

  providers: [DatabaseService],
})
export class DatabaseModule {}
