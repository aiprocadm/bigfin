import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ClsMiddleware } from 'nestjs-cls';
import * as path from 'path';
import './utils/moment-mysql';
import { AppModule } from './modules/App/App.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { isApiDocsEnabled } from './modules/PublicApi/utils/apiDocsFlag';

global.__public_dirname = path.join(__dirname, '..', 'public');
global.__static_dirname = path.join(__dirname, '../static');
global.__views_dirname = path.join(global.__static_dirname, '/views');
global.__images_dirname = path.join(global.__static_dirname, '/images');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  app.set('query parser', 'extended');
  app.setGlobalPrefix('/api');

  // Gracefully close DB pools, Redis/BullMQ connections, scheduled jobs and the
  // PostHog client on SIGTERM/SIGINT (deploys, restarts) instead of leaking them.
  // This is what triggers every module's onModuleDestroy/onApplicationShutdown.
  app.enableShutdownHooks();

  // create and mount the middleware manually here
  app.use(new ClsMiddleware({}).use);

  // Документация API. Этап 15 ТЗ: адрес `/api/docs`, на бою — за флагом.
  // Старый адрес `swagger` оставлен рядом, чтобы не порвать чужие закладки
  // и скрипты; он подчиняется тому же флагу.
  if (isApiDocsEnabled()) {
    const config = new DocumentBuilder()
      .setTitle('Bigfin')
      .setDescription('Публичный API Bigfin')
      .setVersion('1.0')
      // Токен публичного API: по нему Swagger UI умеет ходить в ручки.
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'bgf_...' },
        'apiToken',
      )
      .build();

    const documentFactory = () => SwaggerModule.createDocument(app, config);

    // Глобальный префикс `/api` уже задан выше, поэтому здесь путь без него.
    SwaggerModule.setup('docs', app, documentFactory, {
      useGlobalPrefix: true,
    });
    SwaggerModule.setup('swagger', app, documentFactory);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
