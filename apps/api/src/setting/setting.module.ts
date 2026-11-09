import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { SettingAdminController } from './setting-admin.controller.js';
import { SettingPublicController } from './setting.public.controller.js';
import { SiteSettingRepository } from './site-setting.repository.js';
import { SiteSettingService } from './site-setting.service.js';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [SettingPublicController, SettingAdminController],
  providers: [SiteSettingRepository, SiteSettingService],
})
export class SettingModule {}