import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor.js';
import type { Env } from './config/env.js';
import { corsOrigins } from './config/env.js';

const JSON_BODY_LIMIT = '100kb';

const CORS_METHODS = ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'];

const HSTS_MAX_AGE_SECONDS = 31_536_000;

const DOCS_PATH = 'docs';

export type RuntimeEnv = {
  nodeEnv: Env['NODE_ENV'];
  corsOrigins: string;
  trustProxyHops: number;
};

export function runtimeEnvOf(config: ConfigService<Env, true>): RuntimeEnv {
  return {
    nodeEnv: config.get('NODE_ENV', { infer: true }),
    corsOrigins: config.get('CORS_ORIGINS', { infer: true }),
    trustProxyHops: config.get('TRUST_PROXY_HOPS', { infer: true }),
  };
}

function helmetOptions(nodeEnv: RuntimeEnv['nodeEnv']) {
  const production = nodeEnv === 'production';

  return {
    contentSecurityPolicy: production ? undefined : false,
    crossOriginResourcePolicy: { policy: 'same-site' as const },
    referrerPolicy: { policy: 'no-referrer' as const },
    hsts: production ? { maxAge: HSTS_MAX_AGE_SECONDS, includeSubDomains: true } : false,
  };
}

function documentConfig() {
  return new DocumentBuilder()
    .setTitle('API Website Kelas XI PPLG 1')
    .setDescription(
      'Kontrak layanan untuk situs kelas. Dokumen ini dihasilkan dari dekorator controller.',
    )
    .setVersion('0.1.0')
    .addCookieAuth('kelas_session')
    .build();
}

export function configureApp(app: NestExpressApplication, env: RuntimeEnv): void {
  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxyHops);
  app.use(cookieParser());
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.use(helmet(helmetOptions(env.nodeEnv)));
  app.enableCors({
    origin: corsOrigins(env.corsOrigins),
    credentials: true,
    methods: CORS_METHODS,
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new CorrelationIdInterceptor());

  if (env.nodeEnv !== 'production') {
    SwaggerModule.setup(DOCS_PATH, app, SwaggerModule.createDocument(app, documentConfig()), {
      jsonDocumentUrl: `${DOCS_PATH}/json`,
    });
  }
}