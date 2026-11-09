import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  applyDecorators,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AnnouncementAttachmentOrderSchema,
  ImageVariantSchema,
  MAX_ATTACHMENTS_PER_REQUEST,
  MAX_ATTACHMENT_BYTES,
  UuidSchema,
  type AnnouncementAttachment,
  type AnnouncementAttachmentOrder,
  type ImageVariant,
} from '@kelas/contracts';
import type { Request, Response } from 'express';
import { AuthGuard, CurrentSession, Roles, RolesGuard } from '../auth/auth.guard.js';
import type { SessionContext } from '../auth/auth.service.js';
import type { RequestContext } from '../common/http/request-context.js';
import { requestContextOf } from '../common/http/request-context.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { Env } from '../config/env.js';
import type { UploadedAttachmentFile } from './announcement-attachment.service.js';
import { AnnouncementAttachmentService } from './announcement-attachment.service.js';

const WRITE_LIMIT = { default: { limit: 40, ttl: 60_000 } };

const PREVIEW_CACHE = 'private, max-age=60';

const DEFAULT_VARIANT: ImageVariant = 'sedang';

const VARIANT_QUERY = ImageVariantSchema.catch(DEFAULT_VARIANT);

const MAX_FILES = MAX_ATTACHMENTS_PER_REQUEST;

function adminHeaders(): MethodDecorator {
  return applyDecorators(
    Header('Cache-Control', 'no-store'),
    Header('Vary', 'Cookie'),
    Header('X-Robots-Tag', 'noindex'),
  );
}

function writeRoute(): MethodDecorator {
  return applyDecorators(adminHeaders(), Throttle(WRITE_LIMIT));
}

@ApiTags('pengumuman-lampiran')
@ApiCookieAuth('kelas_session')
@Controller('api/admin/announcements/:id/attachments')
@UseGuards(AuthGuard, RolesGuard)
@Roles('editor', 'admin')
export class AnnouncementAttachmentController {
  constructor(
    private readonly service: AnnouncementAttachmentService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private contextOf(request: Request): RequestContext {
    return requestContextOf(request, this.config.get('APP_SECRET', { infer: true }));
  }

  @Post()
  @writeRoute()
  @UseInterceptors(
    AnyFilesInterceptor({
      limits: { fileSize: MAX_ATTACHMENT_BYTES, files: MAX_FILES, fields: 4 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Mengunggah satu atau beberapa lampiran pengumuman' })
  @ApiParam({ name: 'id', description: 'UUID pengumuman' })
  @ApiOkResponse({ description: 'Seluruh lampiran setelah unggahan' })
  async upload(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @UploadedFiles() files: UploadedAttachmentFile[] | undefined,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
  ): Promise<AnnouncementAttachment[]> {
    return this.service.upload(id, files ?? [], session, this.contextOf(request));
  }

  @Patch('order')
  @writeRoute()
  @ApiOperation({ summary: 'Menyimpan urutan lampiran sekali jalan' })
  @ApiParam({ name: 'id', description: 'UUID pengumuman' })
  @ApiOkResponse({ description: 'Lampiran dalam urutan yang baru' })
  reorder(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @Body(new ZodValidationPipe(AnnouncementAttachmentOrderSchema))
    body: AnnouncementAttachmentOrder,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
  ): Promise<AnnouncementAttachment[]> {
    return this.service.reorder(id, body.ids, session, this.contextOf(request));
  }

  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @writeRoute()
  @ApiOperation({ summary: 'Menghapus satu lampiran pengumuman' })
  @ApiParam({ name: 'id', description: 'UUID pengumuman' })
  @ApiParam({ name: 'attachmentId', description: 'UUID lampiran' })
  @ApiOkResponse({ description: 'Lampiran dihapus' })
  async remove(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @Param('attachmentId', new ZodValidationPipe(UuidSchema)) attachmentId: string,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
  ): Promise<void> {
    await this.service.remove(id, attachmentId, session, this.contextOf(request));
  }

  @Get(':attachmentId/media')
  @adminHeaders()
  @ApiOperation({ summary: 'Menyajikan lampiran untuk pratinjau, termasuk pengumuman draf' })
  @ApiParam({ name: 'id', description: 'UUID pengumuman' })
  @ApiParam({ name: 'attachmentId', description: 'UUID lampiran' })
  @ApiOkResponse({ description: 'Berkas lampiran dengan cache privat' })
  async preview(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @Param('attachmentId', new ZodValidationPipe(UuidSchema)) attachmentId: string,
    @Query('ukuran', new ZodValidationPipe(VARIANT_QUERY)) variant: ImageVariant,
    @Res() response: Response,
  ): Promise<void> {
    const served = await this.service.serve(id, attachmentId, variant, false);

    response.setHeader('Cache-Control', PREVIEW_CACHE);
    response.setHeader('X-Content-Type-Options', 'nosniff');

    if (served.kind === 'redirect') {
      response.redirect(HttpStatus.FOUND, served.location);

      return;
    }

    response.setHeader('Content-Type', served.mimeType);
    response.setHeader('Content-Length', String(served.byteSize));
    response.setHeader('Content-Disposition', 'inline');
    served.stream.on('error', () => response.destroy());
    served.stream.pipe(response);
  }
}