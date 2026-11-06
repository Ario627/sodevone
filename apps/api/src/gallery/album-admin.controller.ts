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
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AlbumAdminListQuerySchema,
  AlbumCreateSchema,
  AlbumUpdateSchema,
  ImageAltUpdateSchema,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_IMAGES_PER_REQUEST,
  UuidSchema,
  type AlbumAdminDetail,
  type AlbumAdminListQuery,
  type AlbumAdminPage,
  type AlbumCreate,
  type AlbumUpdate,
  type GalleryImage,
  type ImageAltUpdate,
  type ImageUploadResult,
} from '@kelas/contracts';
import type { Request, Response } from 'express';
import { AuthGuard, CurrentSession, Roles, RolesGuard } from '../auth/auth.guard.js';
import type { SessionContext } from '../auth/auth.service.js';
import type { RequestContext } from '../common/http/request-context.js';
import { requestContextOf } from '../common/http/request-context.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { Env } from '../config/env.js';
import { AlbumAdminService } from './album-admin.service.js';
import type { UploadedFile } from './album-admin.service.js';

const WRITE_LIMIT = { default: { limit: 60, ttl: 60_000 } };

const UPLOAD_LIMIT = { default: { limit: 20, ttl: 600_000 } };

const UPLOAD_FIELD = 'files';

const UPLOAD_LIMITS = {
  fileSize: MAX_IMAGE_UPLOAD_BYTES,
  files: MAX_IMAGES_PER_REQUEST,
  fields: 4,
  parts: MAX_IMAGES_PER_REQUEST + 4,
};

const ALBUM_IMAGE_ROUTE = ':id/images/:imageId';

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

function imageLocationOf(albumId: string, imageId: string): string {
  return `/api/admin/albums/${albumId}/images/${imageId}`;
}

@ApiTags('album-admin')
@ApiCookieAuth('kelas_session')
@Controller('api/admin/albums')
@UseGuards(AuthGuard, RolesGuard)
@Roles('editor', 'admin')
export class AlbumAdminController {
  constructor(
    private readonly service: AlbumAdminService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private contextOf(request: Request): RequestContext {
    return requestContextOf(request, this.config.get('APP_SECRET', { infer: true }));
  }

  @Get()
  @adminHeaders()
  @ApiOperation({ summary: 'Daftar album termasuk draf dan arsip' })
  @ApiOkResponse({ description: 'Daftar album beserta meta paginasi' })
  list(
    @Query(new ZodValidationPipe(AlbumAdminListQuerySchema)) query: AlbumAdminListQuery,
  ): Promise<AlbumAdminPage> {
    return this.service.list(query);
  }

  @Get(':id')
  @adminHeaders()
  @ApiOperation({ summary: 'Detail album beserta seluruh foto' })
  @ApiParam({ name: 'id', description: 'UUID album' })
  @ApiOkResponse({ description: 'Detail album untuk panel pengelola' })
  detail(@Param('id', new ZodValidationPipe(UuidSchema)) id: string): Promise<AlbumAdminDetail> {
    return this.service.detail(id);
  }

  @Post()
  @writeRoute()
  @ApiOperation({ summary: 'Membuat album draf baru' })
  @ApiOkResponse({ description: 'Album yang dibuat' })
  async create(
    @Body(new ZodValidationPipe(AlbumCreateSchema)) body: AlbumCreate,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AlbumAdminDetail> {
    const created = await this.service.create(body, session, this.contextOf(request));

    response.status(HttpStatus.CREATED);
    response.setHeader('Location', `/api/admin/albums/${created.id}`);

    return created;
  }

  @Patch(':id')
  @writeRoute()
  @ApiOperation({ summary: 'Mengubah judul, deskripsi, tanggal, slug, atau sampul album' })
  @ApiParam({ name: 'id', description: 'UUID album' })
  @ApiOkResponse({ description: 'Album setelah perubahan' })
  update(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @Body(new ZodValidationPipe(AlbumUpdateSchema)) body: AlbumUpdate,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
  ): Promise<AlbumAdminDetail> {
    return this.service.update(id, body, session, this.contextOf(request));
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @writeRoute()
  @ApiOperation({ summary: 'Menerbitkan album yang seluruh fotonya sudah berteks alternatif' })
  @ApiParam({ name: 'id', description: 'UUID album' })
  @ApiOkResponse({ description: 'Album setelah diterbitkan' })
  publish(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
  ): Promise<AlbumAdminDetail> {
    return this.service.publish(id, session, this.contextOf(request));
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @writeRoute()
  @ApiOperation({ summary: 'Mengarsipkan album terbit' })
  @ApiParam({ name: 'id', description: 'UUID album' })
  @ApiOkResponse({ description: 'Album setelah diarsipkan' })
  archive(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
  ): Promise<AlbumAdminDetail> {
    return this.service.archive(id, session, this.contextOf(request));
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @writeRoute()
  @Roles('admin')
  @ApiOperation({ summary: 'Mengembalikan album arsip menjadi draf' })
  @ApiParam({ name: 'id', description: 'UUID album' })
  @ApiOkResponse({ description: 'Album setelah dipulihkan' })
  restore(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
  ): Promise<AlbumAdminDetail> {
    return this.service.restore(id, session, this.contextOf(request));
  }

  @Post(':id/images')
  @writeRoute()
  @Throttle(UPLOAD_LIMIT)
  @UseInterceptors(FilesInterceptor(UPLOAD_FIELD, MAX_IMAGES_PER_REQUEST, { limits: UPLOAD_LIMITS }))
  @ApiOperation({ summary: 'Mengunggah satu atau beberapa foto ke album' })
  @ApiParam({ name: 'id', description: 'UUID album' })
  @ApiOkResponse({ description: 'Hasil per berkas: yang berhasil dan yang gagal' })
  upload(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @UploadedFiles() files: UploadedFile[],
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
  ): Promise<ImageUploadResult> {
    return this.service.uploadImages(id, files ?? [], session, this.contextOf(request));
  }

  @Patch(ALBUM_IMAGE_ROUTE)
  @writeRoute()
  @ApiOperation({ summary: 'Mengisi teks alternatif satu foto' })
  @ApiParam({ name: 'id', description: 'UUID album' })
  @ApiParam({ name: 'imageId', description: 'UUID foto' })
  @ApiOkResponse({ description: 'Foto setelah teks alternatif diperbarui' })
  updateAlt(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @Param('imageId', new ZodValidationPipe(UuidSchema)) imageId: string,
    @Body(new ZodValidationPipe(ImageAltUpdateSchema)) body: ImageAltUpdate,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GalleryImage> {
    response.setHeader('Location', imageLocationOf(id, imageId));

    return this.service.updateImageAlt(id, imageId, body.altText, session, this.contextOf(request));
  }

  @Delete(ALBUM_IMAGE_ROUTE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @writeRoute()
  @Roles('admin')
  @ApiOperation({ summary: 'Menghapus permanen satu foto pada album arsip' })
  @ApiParam({ name: 'id', description: 'UUID album' })
  @ApiParam({ name: 'imageId', description: 'UUID foto' })
  @ApiOkResponse({ description: 'Foto beserta berkasnya dihapus' })
  removeImage(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @Param('imageId', new ZodValidationPipe(UuidSchema)) imageId: string,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
  ): Promise<void> {
    return this.service.deleteImage(id, imageId, session, this.contextOf(request));
  }
}