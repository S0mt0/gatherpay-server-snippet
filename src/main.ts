import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { app_description, corsOptions } from './lib/services/config';
import { APP_NAME, APP_VERSION, PORT } from './lib/constants';
import { AllExceptionsFilter } from './lib/filters';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors(corsOptions);

  const configService = app.get(ConfigService);

  const config = new DocumentBuilder()
    .setTitle(APP_NAME)
    .setDescription(app_description)
    .setVersion(APP_VERSION)
    .addBearerAuth({
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
    })
    .setContact('Sewkito', '', 'sewkito@gmail.com')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/v1/doc', app, document);

  await app.listen(configService.get(PORT, 8000));
}

bootstrap();
