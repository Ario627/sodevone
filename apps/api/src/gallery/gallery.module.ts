import { Module } from '@nestjs/common';
import { AlbumPublicController } from './album.public.controller.js';
import { AlbumRepository } from './album.repository.js';
import { AlbumService } from './album.service.js';

@Module({
  controllers: [AlbumPublicController],
  providers: [AlbumRepository, AlbumService],
  exports: [AlbumService],
})
export class GalleryModule {}
