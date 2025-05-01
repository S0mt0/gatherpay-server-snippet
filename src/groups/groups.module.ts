import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { Group, UserGroupMembership } from './models';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Group, UserGroupMembership]),
    UsersModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService, SequelizeModule],
  exports: [SequelizeModule],
})
export class GroupsModule {}
