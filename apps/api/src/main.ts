import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor.js';
import type { Env } from './config/env.js';
import { corsOrigins } from './config/env.js';

const JSON_BODY_LIMIT = '100kb';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const env = {
    NODE_ENV: config.get('NODE_ENV', { infer: true }),
    PORT: config.get('PORT', { infer: true }),
    CORS_ORIGINS: config.get('CORS_ORIGINS', { infer: true }),
    TRUST_PROXY_HOPS: config.get('TRUST_PROXY_HOPS', { infer: true }),
  };

  app.useLogger(app.get(PinoLogger));
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY_HOPS);
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'no-referrer' },
      hsts: env.NODE_ENV === 'production' ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    }),
  );
  app.enableCors({
    origin: corsOrigins(env.CORS_ORIGINS),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new CorrelationIdInterceptor());
  app.enableShutdownHooks();

  if (env.NODE_ENV !== 'production') {
    const documentConfig = new DocumentBuilder()
      .setTitle('API Website Kelas XI PPLG 1')
      .setDescription(
        'Kontrak layanan untuk situs kelas. Dokumen ini dihasilkan dari dekorator controller.',
      )
      .setVersion('0.1.0')
      .addCookieAuth('kelas_session')
      .build();

    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, documentConfig), {
      jsonDocumentUrl: 'docs/json',
    });
  }

  await app.listen(env.PORT);
}

void bootstrap();
