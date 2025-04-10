import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import {
  JWT_ACCESS_TOKEN_EXP,
  JWT_ACCESS_TOKEN_SECRET,
} from 'src/lib/constants';
import { UsersModule } from '../users.module';
import { Session } from './models/session.model';
import { TwilioService } from 'src/lib/services';

@Module({
  imports: [
    SequelizeModule.forFeature([Session]),
    UsersModule,

    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get(JWT_ACCESS_TOKEN_SECRET),
        signOptions: {
          expiresIn: configService.get(JWT_ACCESS_TOKEN_EXP, '15m'),
        },
      }),

      inject: [ConfigService],
      global: true,
    }),
  ],

  controllers: [AuthController],
  providers: [AuthService, TwilioService],
  exports: [AuthService, JwtModule, SequelizeModule, TwilioService],
})
export class AuthModule {}
