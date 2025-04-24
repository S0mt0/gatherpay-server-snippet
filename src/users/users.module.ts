import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserGroup } from './models';
import {
  CloudinaryService,
  FirebaseService,
  TwilioService,
} from 'src/lib/services';
import { AuthController, AuthService } from './auth';
import { Session } from './auth/models';

@Module({
  imports: [SequelizeModule.forFeature([User, UserGroup, Session])],
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    UsersService,
    FirebaseService,
    TwilioService,
    CloudinaryService,
  ],
  exports: [SequelizeModule, FirebaseService, TwilioService, CloudinaryService],
})
export class UsersModule {}
