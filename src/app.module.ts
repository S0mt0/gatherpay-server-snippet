import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { TIME_IN } from './lib/constants';
import { ResponseInterceptor } from './lib/interceptors';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import { AccountsModule } from './accounts/accounts.module';
import { ChatsModule } from './chats/chats.module';
import {
  CloudinaryService,
  DatabaseModule,
  AppConfigModule,
  AppCacheModule,
} from './lib/services';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    AppCacheModule,

    ThrottlerModule.forRoot([
      {
        ttl: TIME_IN.minutes[1],
        limit: 20,
      },
    ]),

    UsersModule,
    GroupsModule,
    AccountsModule,
    ChatsModule,
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

    CloudinaryService,
  ],

  exports: [CloudinaryService],
})
export class AppModule {}
