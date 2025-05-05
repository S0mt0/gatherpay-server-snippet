import { ApiBearerAuth } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';

import { GroupsService } from './groups.service';
import {
  CreateGroupDto,
  GroupNameSearchDto,
  ParseGroupUrlQueryDto,
  UpdateGroupDto,
} from './dto';
import { CurrentUser, Protect } from 'src/lib/decorators';
import { User } from 'src/users/models';

@Protect()
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  createGroup(
    @Body() createGroupDto: CreateGroupDto,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.createGroup(createGroupDto, user);
  }

  @Get()
  findAllMyGroups(
    @CurrentUser('id') userId: string,
    @Query() query: ParseGroupUrlQueryDto,
  ) {
    return this.groupsService.findAllMyGroups(userId, query);
  }

  @Get('/public/search')
  searchPublicGroups(@Query() groupNameSearchDto: GroupNameSearchDto) {
    return this.groupsService.searchPublicGroups(groupNameSearchDto);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') groupId: string) {
    return this.groupsService.findOne(userId, groupId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
    return this.groupsService.update(+id, updateGroupDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groupsService.remove(+id);
  }
}
