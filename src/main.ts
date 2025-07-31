import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/interceptors/exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 'loopback');

  const config = new DocumentBuilder()
    .addBearerAuth()
    .setTitle('Marketplace API')
    .setDescription('Documentation')
    .setVersion('1.0')
    .build();

  app.setGlobalPrefix('api/v1');

  const configuration = app.get(ConfigService);

  const originsString = configuration.get<string>('ORIGINS');
  const origins = originsString ? originsString.split(',') : [];

  //! Cors
  app.enableCors({
    credentials: true,
    origin: origins,
  });

  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // const reflector = app.get(Reflector);
  // app.useGlobalInterceptors(new ResponseInterceptor(reflector));
  // app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('/api/v1/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showRequestDuration: true,
    },
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
