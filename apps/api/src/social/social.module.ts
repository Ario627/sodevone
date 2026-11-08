import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { SocialAdminController } from './social-admin.controller.js';
import { SocialPublicController } from './social.public.controller.js';
import { SocialRepository } from './social.repository.js';
import { SocialService } from './social.service.js';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [SocialPublicController, SocialAdminController],
  providers: [SocialRepository, SocialService],
})
export class SocialModule {}