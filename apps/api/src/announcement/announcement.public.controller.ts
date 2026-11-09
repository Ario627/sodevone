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
  ImageVariantSchema,
  SlugSchema,
  UuidSchema,
  type AnnouncementDetail,
  type AnnouncementListQuery,
  type ImageVariant,
} from '@kelas/contracts';
import type { Response } from 'express';
import { PUBLIC_READ_CACHE } from '../common/http/cache-control.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { AnnouncementAttachmentService } from './announcement-attachment.service.js';
import { AnnouncementService } from './announcement.service.js';
import type { AnnouncementPage } from './announcement.service.js';

const ATTACHMENT_CACHE = 'public, max-age=3600';

const DEFAULT_VARIANT: ImageVariant = 'sedang';

const VARIANT_QUERY = ImageVariantSchema.catch(DEFAULT_VARIANT);

@ApiTags('pengumuman')
@Controller('api/public/announcements')
export class AnnouncementPublicController {
  constructor(
    private readonly service: AnnouncementService,
    private readonly attachments: AnnouncementAttachmentService,
  ) {}

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

  @Get(':slug/attachments/:attachmentId')
  @Header('Cache-Control', ATTACHMENT_CACHE)
  @ApiOperation({ summary: 'Mengunduh lampiran pengumuman yang sudah terbit' })
  @ApiParam({ name: 'slug', description: 'Slug pengumuman' })
  @ApiParam({ name: 'attachmentId', description: 'UUID lampiran' })
  @ApiOkResponse({ description: 'Berkas lampiran' })
  async attachment(
    @Param('slug', new ZodValidationPipe(SlugSchema)) slug: string,
    @Param('attachmentId', new ZodValidationPipe(UuidSchema)) attachmentId: string,
    @Query('ukuran', new ZodValidationPipe(VARIANT_QUERY)) variant: ImageVariant,
    @Res() response: Response,
  ): Promise<void> {
    const served = await this.attachments.serveForSlug(slug, attachmentId, variant);

    response.setHeader('X-Content-Type-Options', 'nosniff');

    if (served.kind === 'redirect') {
      response.redirect(HttpStatus.FOUND, served.location);

      return;
    }

    response.setHeader('Content-Type', served.mimeType);
    response.setHeader('Content-Length', String(served.byteSize));
    response.setHeader(
      'Content-Disposition',
      served.mimeType === 'application/pdf'
        ? `attachment; filename*=UTF-8''${encodeURIComponent(served.fileName)}`
        : 'inline',
    );
    served.stream.on('error', () => response.destroy());
    served.stream.pipe(response);
  }
}
