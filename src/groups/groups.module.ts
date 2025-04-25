import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { Group } from './models/group.model';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [SequelizeModule.forFeature([Group]), UsersModule],
  controllers: [GroupsController],
  providers: [GroupsService, SequelizeModule],
})
export class GroupsModule {}
