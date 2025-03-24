import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class DatabaseService implements OnApplicationBootstrap {
  constructor(private sequelize: Sequelize) {}

  async onApplicationBootstrap() {
    try {
      await this.sequelize.authenticate();
      console.log('Database connection established successfully🗼');
    } catch (error) {
      console.error('Unable to connect to the database⚠️:', error);
      process.exit(1);
    }
  }
}
