import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AnnouncementAdminController } from './announcement-admin.controller.js';
import { AnnouncementAdminRepository } from './announcement-admin.repository.js';
import { AnnouncementAdminService } from './announcement-admin.service.js';
import { AnnouncementPublicController } from './announcement.public.controller.js';
import { AnnouncementRepository } from './announcement.repository.js';
import { AnnouncementService } from './announcement.service.js';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [AnnouncementPublicController, AnnouncementAdminController],
  providers: [
    AnnouncementRepository,
    AnnouncementService,
    AnnouncementAdminRepository,
    AnnouncementAdminService,
  ],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
