import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import {
  ContributionCycle,
  Group,
  UserContribution,
  UserGroupMembership,
} from './models';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    UsersModule,
    SequelizeModule.forFeature([
      Group,
      UserGroupMembership,
      ContributionCycle,
      UserContribution,
    ]),
  ],
  controllers: [GroupsController],
  providers: [GroupsService, SequelizeModule],
  exports: [SequelizeModule],
})
export class GroupsModule {}
