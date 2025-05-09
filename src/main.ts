import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { corsOptions } from './lib/services/config';
import { APP_DESCRIPTION, APP_NAME, APP_VERSION, PORT } from './lib/constants';
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

  const configService = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors(corsOptions);

  const config = new DocumentBuilder()
    .setTitle(APP_NAME)
    .setDescription(APP_DESCRIPTION)
    .setVersion(APP_VERSION)
    .addBearerAuth({
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
    })
    .setContact('Somtochukwu Nkem', '', 'sewkito@gmail.com')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/v1/doc', app, document);

  await app.listen(configService.get(PORT, 8000));
}

bootstrap();
