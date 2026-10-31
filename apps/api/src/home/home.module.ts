import { Module } from '@nestjs/common';
import { AnnouncementModule } from '../announcement/announcement.module.js';
import { EventModule } from '../event/event.module.js';
import { GalleryModule } from '../gallery/gallery.module.js';
import { HomeController } from './home.controller.js';
import { HomeService } from './home.service.js';

@Module({
  imports: [AnnouncementModule, EventModule, GalleryModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}