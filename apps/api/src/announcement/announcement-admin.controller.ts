import {
  Body,
  Controller,
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
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AnnouncementAdminListQuerySchema,
  AnnouncementCreateSchema,
  AnnouncementUpdateSchema,
  UuidSchema,
  type AnnouncementAdminDetail,
  type AnnouncementAdminListQuery,
  type AnnouncementAdminPage,
  type AnnouncementCreate,
  type AnnouncementUpdate,
} from '@kelas/contracts';
import type { Request, Response } from 'express';
import { AuthGuard, CurrentSession, Roles, RolesGuard } from '../auth/auth.guard.js';
import type { SessionContext } from '../auth/auth.service.js';
import { etagOf, expectedVersionOf } from '../common/http/if-match.js';
import type { RequestContext } from '../common/http/request-context.js';
import { requestContextOf } from '../common/http/request-context.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { Env } from '../config/env.js';
import { AnnouncementAdminService } from './announcement-admin.service.js';

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
  return `/api/admin/announcements/${id}`;
}

@ApiTags('pengumuman-admin')
@ApiCookieAuth('kelas_session')
@Controller('api/admin/announcements')
@UseGuards(AuthGuard, RolesGuard)
export class AnnouncementAdminController {
  constructor(
    private readonly service: AnnouncementAdminService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private contextOf(request: Request): RequestContext {
    return requestContextOf(request, this.config.get('APP_SECRET', { infer: true }));
  }

  @Get()
  @adminHeaders()
  @Roles('editor', 'admin')
  @ApiOperation({ summary: 'Daftar pengumuman termasuk draf dan arsip' })
  @ApiOkResponse({ description: 'Daftar pengumuman beserta meta paginasi' })
  list(
    @Query(new ZodValidationPipe(AnnouncementAdminListQuerySchema))
    query: AnnouncementAdminListQuery,
  ): Promise<AnnouncementAdminPage> {
    return this.service.list(query);
  }

  @Get(':id')
  @adminHeaders()
  @Roles('editor', 'admin')
  @ApiOperation({ summary: 'Detail pengumuman untuk pratinjau editor' })
  @ApiParam({ name: 'id', description: 'UUID pengumuman' })
  @ApiOkResponse({ description: 'Detail pengumuman dengan isi yang sudah dirender' })
  async detail(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AnnouncementAdminDetail> {
    const detail = await this.service.detail(id);

    response.setHeader('ETag', etagOf(detail.version));

    return detail;
  }

  @Post()
  @writeRoute()
  @Roles('editor', 'admin')
  @ApiOperation({ summary: 'Membuat draf pengumuman baru' })
  @ApiOkResponse({ description: 'Draf pengumuman yang dibuat' })
  async create(
    @Body(new ZodValidationPipe(AnnouncementCreateSchema)) body: AnnouncementCreate,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AnnouncementAdminDetail> {
    const created = await this.service.create(body, session, this.contextOf(request));

    response.status(HttpStatus.CREATED);
    response.setHeader('Location', locationOf(created.id));
    response.setHeader('ETag', etagOf(created.version));

    return created;
  }

  @Patch(':id')
  @writeRoute()
  @Roles('editor', 'admin')
  @ApiOperation({ summary: 'Mengubah isi pengumuman' })
  @ApiParam({ name: 'id', description: 'UUID pengumuman' })
  @ApiOkResponse({ description: 'Pengumuman setelah perubahan' })
  async update(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @Body(new ZodValidationPipe(AnnouncementUpdateSchema)) body: AnnouncementUpdate,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AnnouncementAdminDetail> {
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
  @Roles('editor', 'admin')
  @ApiOperation({ summary: 'Menerbitkan pengumuman draf' })
  @ApiParam({ name: 'id', description: 'UUID pengumuman' })
  @ApiOkResponse({ description: 'Pengumuman setelah diterbitkan' })
  publish(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AnnouncementAdminDetail> {
    return this.transition('publish', id, session, request, response);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @writeRoute()
  @Roles('editor', 'admin')
  @ApiOperation({ summary: 'Mengarsipkan pengumuman terbit' })
  @ApiParam({ name: 'id', description: 'UUID pengumuman' })
  @ApiOkResponse({ description: 'Pengumuman setelah diarsipkan' })
  archive(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AnnouncementAdminDetail> {
    return this.transition('archive', id, session, request, response);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @writeRoute()
  @Roles('admin')
  @ApiOperation({ summary: 'Mengembalikan pengumuman arsip menjadi draf' })
  @ApiParam({ name: 'id', description: 'UUID pengumuman' })
  @ApiOkResponse({ description: 'Pengumuman setelah dipulihkan' })
  restore(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AnnouncementAdminDetail> {
    return this.transition('restore', id, session, request, response);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @writeRoute()
  @Roles('admin')
  @ApiOperation({ summary: 'Menarik pengumuman terbit menjadi draf' })
  @ApiParam({ name: 'id', description: 'UUID pengumuman' })
  @ApiOkResponse({ description: 'Pengumuman setelah ditarik menjadi draf' })
  unpublish(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AnnouncementAdminDetail> {
    return this.transition('unpublish', id, session, request, response);
  }

  private async transition(
    action: 'publish' | 'archive' | 'restore' | 'unpublish',
    id: string,
    session: SessionContext,
    request: Request,
    response: Response,
  ): Promise<AnnouncementAdminDetail> {
    const context = this.contextOf(request);
    const expectedVersion = expectedVersionOf(request.headers['if-match']);
    const result = await this.service[action](id, session, context, expectedVersion);

    response.setHeader('ETag', etagOf(result.version));

    return result;
  }
}