import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  // Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Protect } from 'src/lib/decorators';

@Protect()
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getSessionUser() {
    return {};
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return '';
  // }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return updateUserDto;
  }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return '';
  // }
}
