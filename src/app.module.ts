import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import {
  JWT_ACCESS_TOKEN_EXP,
  JWT_ACCESS_TOKEN_SECRET,
  TIME_IN,
} from './lib/constants';
import { ResponseInterceptor } from './lib/interceptors';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import {
  DatabaseModule,
  AppConfigModule,
  AppCacheModule,
} from './lib/services';
import { DeviceInfoMiddleware } from './lib/middlewares';
import { AuthController } from './users/auth/auth.controller';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    AppCacheModule,

    ThrottlerModule.forRoot([
      {
        ttl: TIME_IN.minutes[1],
        limit: 100,
      },
    ]),

    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get(JWT_ACCESS_TOKEN_SECRET),
        signOptions: {
          expiresIn: configService.get(JWT_ACCESS_TOKEN_EXP, '1d'),
        },
      }),
      inject: [ConfigService],
      global: true,
    }),

    UsersModule,
    GroupsModule,
    MessagesModule,
    NotificationsModule,
  ],

  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },

    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(DeviceInfoMiddleware).forRoutes(AuthController);
  }
}
