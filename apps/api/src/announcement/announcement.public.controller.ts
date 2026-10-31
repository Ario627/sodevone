import {
  Controller,
  Get,
  Header,
  HttpStatus,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  AnnouncementListQuerySchema,
  SlugSchema,
  type AnnouncementDetail,
  type AnnouncementListQuery,
} from '@kelas/contracts';
import type { Response } from 'express';
import { PUBLIC_READ_CACHE } from '../common/http/cache-control.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { AnnouncementService } from './announcement.service.js';
import type { AnnouncementPage } from './announcement.service.js';

@ApiTags('pengumuman')
@Controller('api/public/announcements')
export class AnnouncementPublicController {
  constructor(private readonly service: AnnouncementService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar pengumuman yang sudah terbit' })
  @ApiOkResponse({ description: 'Daftar pengumuman beserta meta paginasi' })
  @Header('Cache-Control', PUBLIC_READ_CACHE)
  list(
    @Query(new ZodValidationPipe(AnnouncementListQuerySchema)) query: AnnouncementListQuery,
  ): Promise<AnnouncementPage> {
    return this.service.list(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Detail pengumuman berdasarkan slug' })
  @ApiParam({ name: 'slug', description: 'Slug pengumuman' })
  @ApiOkResponse({ description: 'Detail pengumuman dengan isi yang sudah dirender' })
  async detail(
    @Param('slug', new ZodValidationPipe(SlugSchema)) slug: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AnnouncementDetail> {
    const result = await this.service.detail(slug);

    if (result.kind === 'missing') {
      throw new NotFoundException('Pengumuman tidak ditemukan.');
    }

    if (result.kind === 'moved') {
      response.status(HttpStatus.MOVED_PERMANENTLY);
      response.setHeader('Location', `/api/public/announcements/${result.slug}`);
      response.setHeader('Cache-Control', 'no-store');
    } else {
      response.setHeader('Cache-Control', PUBLIC_READ_CACHE);
    }

    return result.detail;
  }
}