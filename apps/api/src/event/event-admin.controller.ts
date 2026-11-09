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
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  EventAdminListQuerySchema,
  EventCreateSchema,
  EventImagesSchema,
  EventUpdateSchema,
  UuidSchema,
  type EventAdminDetail,
  type EventAdminListQuery,
  type EventAdminPage,
  type EventCreate,
  type EventImages,
  type EventUpdate,
} from '@kelas/contracts';
import type { Request, Response } from 'express';
import { AuthGuard, CurrentSession, Roles, RolesGuard } from '../auth/auth.guard.js';
import type { SessionContext } from '../auth/auth.service.js';
import { etagOf, expectedVersionOf } from '../common/http/if-match.js';
import type { RequestContext } from '../common/http/request-context.js';
import { requestContextOf } from '../common/http/request-context.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { Env } from '../config/env.js';
import { EventAdminService } from './event-admin.service.js';

const WRITE_LIMIT = { default: { limit: 60, ttl: 60_000 } };

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

function locationOf(id: string): string {
  return `/api/admin/events/${id}`;
}

@ApiTags('agenda-admin')
@ApiCookieAuth('kelas_session')
@Controller('api/admin/events')
@UseGuards(AuthGuard, RolesGuard)
@Roles('editor', 'admin')
export class EventAdminController {
  constructor(
    private readonly service: EventAdminService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private contextOf(request: Request): RequestContext {
    return requestContextOf(request, this.config.get('APP_SECRET', { infer: true }));
  }

  @Get()
  @adminHeaders()
  @ApiOperation({ summary: 'Daftar kegiatan termasuk draf dan arsip' })
  @ApiOkResponse({ description: 'Daftar kegiatan beserta meta paginasi' })
  list(
    @Query(new ZodValidationPipe(EventAdminListQuerySchema)) query: EventAdminListQuery,
  ): Promise<EventAdminPage> {
    return this.service.list(query);
  }

  @Get(':id')
  @adminHeaders()
  @ApiOperation({ summary: 'Detail kegiatan untuk panel pengelola' })
  @ApiParam({ name: 'id', description: 'UUID kegiatan' })
  @ApiOkResponse({ description: 'Detail kegiatan beserta deskripsi lengkap' })
  async detail(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<EventAdminDetail> {
    const detail = await this.service.detail(id);

    response.setHeader('ETag', etagOf(detail.version));

    return detail;
  }

  @Post()
  @writeRoute()
  @ApiOperation({ summary: 'Membuat draf kegiatan baru' })
  @ApiCreatedResponse({ description: 'Draf kegiatan yang dibuat' })
  async create(
    @Body(new ZodValidationPipe(EventCreateSchema)) body: EventCreate,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<EventAdminDetail> {
    const created = await this.service.create(body, session, this.contextOf(request));

    response.status(HttpStatus.CREATED);
    response.setHeader('Location', locationOf(created.id));
    response.setHeader('ETag', etagOf(created.version));

    return created;
  }

  @Patch(':id')
  @writeRoute()
  @ApiOperation({ summary: 'Mengubah judul, deskripsi, lokasi, waktu, atau slug kegiatan' })
  @ApiParam({ name: 'id', description: 'UUID kegiatan' })
  @ApiOkResponse({ description: 'Kegiatan setelah perubahan' })
  async update(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @Body(new ZodValidationPipe(EventUpdateSchema)) body: EventUpdate,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<EventAdminDetail> {
    const updated = await this.service.update(
      id,
      body,
      session,
      this.contextOf(request),
      expectedVersionOf(request.headers['if-match']),
    );

    response.setHeader('ETag', etagOf(updated.version));

    return updated;
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @writeRoute()
  @ApiOperation({ summary: 'Menerbitkan kegiatan draf' })
  @ApiParam({ name: 'id', description: 'UUID kegiatan' })
  @ApiOkResponse({ description: 'Kegiatan setelah diterbitkan' })
  publish(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<EventAdminDetail> {
    return this.transition('publish', id, session, request, response);
  }

  @Delete(':id')
  @writeRoute()
  @ApiOperation({ summary: 'Mengarsipkan kegiatan terbit' })
  @ApiParam({ name: 'id', description: 'UUID kegiatan' })
  @ApiOkResponse({ description: 'Kegiatan setelah diarsipkan, datanya tidak dihapus' })
  archive(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<EventAdminDetail> {
    return this.transition('archive', id, session, request, response);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @writeRoute()
  @Roles('admin')
  @ApiOperation({ summary: 'Mengembalikan kegiatan arsip menjadi draf' })
  @ApiParam({ name: 'id', description: 'UUID kegiatan' })
  @ApiOkResponse({ description: 'Kegiatan setelah dipulihkan' })
  restore(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<EventAdminDetail> {
    return this.transition('restore', id, session, request, response);
  }

  @Patch(':id/images')
  @writeRoute()
  @Roles('editor', 'admin')
  @ApiOperation({ summary: 'Mengganti daftar foto kegiatan dari album galeri' })
  @ApiParam({ name: 'id', description: 'UUID kegiatan' })
  @ApiOkResponse({ description: 'Kegiatan setelah foto diganti' })
  async setImages(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @Body(new ZodValidationPipe(EventImagesSchema)) body: EventImages,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<EventAdminDetail> {
    const result = await this.service.setImages(
      id,
      body.imageIds,
      session,
      this.contextOf(request),
    );

    response.setHeader('ETag', etagOf(result.version));

    return result;
  }

  private async transition(
    action: 'publish' | 'archive' | 'restore',
    id: string,
    session: SessionContext,
    request: Request,
    response: Response,
  ): Promise<EventAdminDetail> {
    const context = this.contextOf(request);
    const expectedVersion = expectedVersionOf(request.headers['if-match']);
    const result = await this.service[action](id, session, context, expectedVersion);

    response.setHeader('ETag', etagOf(result.version));

    return result;
  }
}
