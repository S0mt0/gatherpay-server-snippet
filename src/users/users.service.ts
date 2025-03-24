import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { User } from './models/user.model';
import { CreateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User) private userModel: typeof User) {}

  async findOne(): Promise<User | undefined> {
    return;
  }

  create(dto: CreateUserDto) {
    return this.userModel.create({ ...dto });
  }

  findAll() {
    return this.userModel.findAll();
  }
}
