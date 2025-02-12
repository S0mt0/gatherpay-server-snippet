import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './lib/database/database.module';
import { AppConfigModule } from './lib/config/config.module';
import { AppCacheModule } from './lib/cache/cache.module';
import { TIME_IN } from './lib/constants';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    AppCacheModule,
    ThrottlerModule.forRoot([
      {
        ttl: TIME_IN.minutes[1],
        limit: 100, // Max 100 requests per minute
      },
    ]),
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
