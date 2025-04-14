import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { Group } from './models/group.model';

@Module({
  imports: [SequelizeModule.forFeature([Group])],
  controllers: [GroupsController],
  providers: [GroupsService, SequelizeModule],
})
export class GroupsModule {}
