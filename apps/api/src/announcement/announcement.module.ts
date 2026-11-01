import { Module } from '@nestjs/common';
import { AnnouncementPublicController } from './announcement.public.controller.js';
import { AnnouncementRepository } from './announcement.repository.js';
import { AnnouncementService } from './announcement.service.js';

@Module({
  controllers: [AnnouncementPublicController],
  providers: [AnnouncementRepository, AnnouncementService],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
