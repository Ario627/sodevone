import {
  Body,
  Controller,
  Get,
  Header,
  Put,
  Req,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MemberRosterSchema, type MemberAdminList, type MemberRoster } from '@kelas/contracts';
import type { Request } from 'express';
import { AuthGuard, CurrentSession, Roles, RolesGuard } from '../auth/auth.guard.js';
import type { SessionContext } from '../auth/auth.service.js';
import type { RequestContext } from '../common/http/request-context.js';
import { requestContextOf } from '../common/http/request-context.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { Env } from '../config/env.js';
import { MemberService } from './member.service.js';

const WRITE_LIMIT = { default: { limit: 20, ttl: 60_000 } };

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

@ApiTags('anggota-admin')
@ApiCookieAuth('kelas_session')
@Controller('api/admin/members')
@UseGuards(AuthGuard, RolesGuard)
@Roles('editor', 'admin')
export class MemberAdminController {
  constructor(
    private readonly service: MemberService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private contextOf(request: Request): RequestContext {
    return requestContextOf(request, this.config.get('APP_SECRET', { infer: true }));
  }

  @Get()
  @adminHeaders()
  @ApiOperation({ summary: 'Daftar anggota termasuk yang belum ditampilkan di situs' })
  @ApiOkResponse({ description: 'Seluruh baris anggota dalam urutan kursi' })
  roster(): Promise<MemberAdminList> {
    return this.service.roster();
  }

  @Put()
  @writeRoute()
  @ApiOperation({ summary: 'Mengganti seluruh daftar anggota dalam satu transaksi' })
  @ApiOkResponse({ description: 'Daftar anggota setelah penggantian' })
  replace(
    @Body(new ZodValidationPipe(MemberRosterSchema)) body: MemberRoster,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
  ): Promise<MemberAdminList> {
    return this.service.replace(body, session, this.contextOf(request));
  }
}