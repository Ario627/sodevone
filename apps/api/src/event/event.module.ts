import { Module } from '@nestjs/common';
import { EventPublicController } from './event.public.controller.js';
import { EventRepository } from './event.repository.js';
import { EventService } from './event.service.js';

@Module({
  controllers: [EventPublicController],
  providers: [EventRepository, EventService],
  exports: [EventService],
})
export class EventModule {}
