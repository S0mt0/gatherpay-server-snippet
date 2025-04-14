import { SwaggerDocumentOptions } from '@nestjs/swagger';

import { GroupsModule } from 'src/groups/groups.module';
import { UsersModule } from 'src/users/users.module';

export const app_description = 'API documentation of the Gatherpay server.';

export const swaggerOptions: SwaggerDocumentOptions = {
  include: [GroupsModule, UsersModule],
  autoTagControllers: true,
  deepScanRoutes: true,
};
