import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AdminUserModule } from './admin-user/admin-user.module.js';
import { AnnouncementModule } from './announcement/announcement.module.js';
import { AuditAdminModule } from './audit/audit-admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ApiThrottlerGuard } from './common/guards/api-throttler.guard.js';
import { OriginGuard } from './common/guards/origin.guard.js';
import { DatabaseModule } from './db/database.module.js';
import { EventModule } from './event/event.module.js';
import { GalleryModule } from './gallery/gallery.module.js';
import { HealthModule } from './health/health.module.js';
import { HomeModule } from './home/home.module.js';
import { MediaModule } from './media/media.module.js';
import { SocialModule } from './social/social.module.js';
import type { Env } from './config/env.js';
import { parseEnv } from './config/env.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      validate: parseEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          autoLogging: config.get('NODE_ENV', { infer: true }) !== 'test',
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.headers["x-api-key"]',
              'res.headers["set-cookie"]',
              'req.body.password',
              'req.body.currentPassword',
              'req.body.newPassword',
            ],
            remove: true,
          },
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [
        {
          ttl: config.get('RATE_LIMIT_TTL_SECONDS', { infer: true }) * 1000,
          limit: config.get('RATE_LIMIT_LIMIT', { infer: true }),
        },
      ],
    }),
    DatabaseModule,
    AnnouncementModule,
    EventModule,
    GalleryModule,
    MediaModule,
    SocialModule,
    HomeModule,
    HealthModule,
    AuthModule,
    AdminUserModule,
    AuditAdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: OriginGuard,
    },
  ],
})
export class AppModule {}
