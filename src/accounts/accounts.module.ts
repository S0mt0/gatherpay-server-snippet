import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { AccountDetail } from './models/account.model';

@Module({
  imports: [SequelizeModule.forFeature([AccountDetail])],
  controllers: [AccountsController],
  providers: [AccountsService, SequelizeModule],
})
export class AccountsModule {}
