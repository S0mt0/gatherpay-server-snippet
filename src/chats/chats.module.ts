import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { ChatsService } from './chats.service';
import { ChatsController } from './chats.controller';
import { Chat } from './models/chat.model';

@Module({
  imports: [SequelizeModule.forFeature([Chat])],
  controllers: [ChatsController],
  providers: [ChatsService, SequelizeModule],
})
export class ChatsModule {}
