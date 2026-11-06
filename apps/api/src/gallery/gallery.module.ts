import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { MediaModule } from '../media/media.module.js';
import { AlbumAdminController } from './album-admin.controller.js';
import { AlbumAdminRepository } from './album-admin.repository.js';
import { AlbumAdminService } from './album-admin.service.js';
import { AlbumImageRepository } from './album-image.repository.js';
import { AlbumPublicController } from './album.public.controller.js';
import { AlbumRepository } from './album.repository.js';
import { AlbumService } from './album.service.js';

@Module({
  imports: [AuditModule, AuthModule, MediaModule],
  controllers: [AlbumPublicController, AlbumAdminController],
  providers: [
    AlbumRepository,
    AlbumService,
    AlbumAdminRepository,
    AlbumImageRepository,
    AlbumAdminService,
  ],
  exports: [AlbumService],
})
export class GalleryModule {}
