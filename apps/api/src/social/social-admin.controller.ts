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
  Req,
  Res,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  SocialLinkCreateSchema,
  SocialLinkUpdateSchema,
  UuidSchema,
  type SocialLinkAdmin,
  type SocialLinkAdminList,
  type SocialLinkCreate,
  type SocialLinkUpdate,
} from '@kelas/contracts';
import type { Request, Response } from 'express';
import { AuthGuard, CurrentSession, Roles, RolesGuard } from '../auth/auth.guard.js';
import type { SessionContext } from '../auth/auth.service.js';
import type { RequestContext } from '../common/http/request-context.js';
import { requestContextOf } from '../common/http/request-context.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { Env } from '../config/env.js';
import { SocialService } from './social.service.js';

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

@ApiTags('sosial-admin')
@ApiCookieAuth('kelas_session')
@Controller('api/admin/social')
@UseGuards(AuthGuard, RolesGuard)
@Roles('editor', 'admin')
export class SocialAdminController {
  constructor(
    private readonly service: SocialService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private contextOf(request: Request): RequestContext {
    return requestContextOf(request, this.config.get('APP_SECRET', { infer: true }));
  }

  @Get()
  @adminHeaders()
  @ApiOperation({ summary: 'Daftar seluruh tautan sosial termasuk yang disembunyikan' })
  @ApiOkResponse({ description: 'Daftar tautan untuk panel pengelola' })
  list(): Promise<SocialLinkAdminList> {
    return this.service.list();
  }

  @Post()
  @writeRoute()
  @ApiOperation({ summary: 'Menambah satu tautan sosial' })
  @ApiOkResponse({ description: 'Tautan yang dibuat' })
  async create(
    @Body(new ZodValidationPipe(SocialLinkCreateSchema)) body: SocialLinkCreate,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SocialLinkAdmin> {
    const created = await this.service.create(body, session, this.contextOf(request));

    response.status(HttpStatus.CREATED);
    response.setHeader('Location', `/api/admin/social/${created.id}`);

    return created;
  }

  @Patch(':id')
  @writeRoute()
  @ApiOperation({ summary: 'Mengubah tautan, keterangan, gambar, atau urutan' })
  @ApiParam({ name: 'id', description: 'UUID tautan' })
  @ApiOkResponse({ description: 'Tautan setelah perubahan' })
  update(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @Body(new ZodValidationPipe(SocialLinkUpdateSchema)) body: SocialLinkUpdate,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
  ): Promise<SocialLinkAdmin> {
    return this.service.update(id, body, session, this.contextOf(request));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @writeRoute()
  @Roles('admin')
  @ApiOperation({ summary: 'Menghapus satu tautan sosial' })
  @ApiParam({ name: 'id', description: 'UUID tautan' })
  @ApiOkResponse({ description: 'Tautan dihapus' })
  async remove(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
  ): Promise<void> {
    await this.service.remove(id, session, this.contextOf(request));
  }
}