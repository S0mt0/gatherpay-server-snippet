import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';
import { Message } from './models';

@Module({
  imports: [SequelizeModule.forFeature([Message])],
  providers: [MessagesGateway, MessagesService],
})
export class MessagesModule {}
