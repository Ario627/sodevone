import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Put,
  Req,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  VoxelBoardInputSchema,
  type SiteSettingAdmin,
  type VoxelBoardInput,
} from '@kelas/contracts';
import type { Request } from 'express';
import { AuthGuard, CurrentSession, Roles, RolesGuard } from '../auth/auth.guard.js';
import type { SessionContext } from '../auth/auth.service.js';
import type { RequestContext } from '../common/http/request-context.js';
import { requestContextOf } from '../common/http/request-context.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { Env } from '../config/env.js';
import { SiteSettingService } from './site-setting.service.js';

const WRITE_LIMIT = { default: { limit: 30, ttl: 60_000 } };

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

@ApiTags('pengaturan-admin')
@ApiCookieAuth('kelas_session')
@Controller('api/admin/settings')
@UseGuards(AuthGuard, RolesGuard)
@Roles('editor', 'admin')
export class SettingAdminController {
  constructor(
    private readonly service: SiteSettingService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private contextOf(request: Request): RequestContext {
    return requestContextOf(request, this.config.get('APP_SECRET', { infer: true }));
  }

  @Get()
  @adminHeaders()
  @ApiOperation({ summary: 'Pengaturan situs saat ini termasuk yang belum diterbitkan' })
  @ApiOkResponse({ description: 'Pengaturan situs' })
  read(): Promise<SiteSettingAdmin> {
    return this.service.adminSettings();
  }

  @Put('voxel-board')
  @writeRoute()
  @ApiOperation({ summary: 'Menyimpan papan piksel beranda' })
  @ApiOkResponse({ description: 'Pengaturan situs setelah perubahan' })
  saveVoxelBoard(
    @Body(new ZodValidationPipe(VoxelBoardInputSchema)) body: VoxelBoardInput,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
  ): Promise<SiteSettingAdmin> {
    return this.service.saveVoxelBoard(body, session, this.contextOf(request));
  }

  @Delete('voxel-board')
  @HttpCode(HttpStatus.OK)
  @writeRoute()
  @Roles('admin')
  @ApiOperation({ summary: 'Mengembalikan papan piksel ke bawaan XI' })
  @ApiOkResponse({ description: 'Pengaturan situs setelah dikembalikan' })
  resetVoxelBoard(
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
  ): Promise<SiteSettingAdmin> {
    return this.service.resetVoxelBoard(session, this.contextOf(request));
  }
}