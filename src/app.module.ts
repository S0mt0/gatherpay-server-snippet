import { APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

import { UsersModule } from './users/users.module';
import { DatabaseModule } from './lib/services/database/database.module';
import { AppConfigModule } from './lib/services/config/config.module';
import { AppCacheModule } from './lib/services/cache/cache.module';
import { TIME_IN } from './lib/constants';
import { ResponseInterceptor } from './lib/interceptors';
import { GroupsModule } from './groups/groups.module';
import { AccountsModule } from './accounts/accounts.module';
import { ChatsModule } from './chats/chats.module';

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
  ],
})
export class AppModule {}
