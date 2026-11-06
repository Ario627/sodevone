import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { EventAdminController } from './event-admin.controller.js';
import { EventAdminRepository } from './event-admin.repository.js';
import { EventAdminService } from './event-admin.service.js';
import { EventPublicController } from './event.public.controller.js';
import { EventRepository } from './event.repository.js';
import { EventService } from './event.service.js';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [EventPublicController, EventAdminController],
  providers: [EventRepository, EventService, EventAdminRepository, EventAdminService],
  exports: [EventService],
})
export class EventModule {}