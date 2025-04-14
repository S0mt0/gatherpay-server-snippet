import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { User, UserGroup } from './models';
import { Session } from './auth/models/session.model';
import { CloudinaryService, TwilioService } from 'src/lib/services';

@Module({
  imports: [SequelizeModule.forFeature([User, UserGroup, Session])],
  controllers: [AuthController, UsersController],
  providers: [UsersService, AuthService, CloudinaryService, TwilioService],
  exports: [SequelizeModule, CloudinaryService, TwilioService],
})
export class UsersModule {}
