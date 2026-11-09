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
import {
  ContributorInputSchema,
  type ContributorAdmin,
  type ContributorInput,
} from '@kelas/contracts';
import type { Request } from 'express';
import { AuthGuard, CurrentSession, Roles, RolesGuard } from '../auth/auth.guard.js';
import type { SessionContext } from '../auth/auth.service.js';
import type { RequestContext } from '../common/http/request-context.js';
import { requestContextOf } from '../common/http/request-context.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { Env } from '../config/env.js';
import { ContributorService } from './contributor.service.js';

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

@ApiTags('pembuat-admin')
@ApiCookieAuth('kelas_session')
@Controller('api/admin/contributor')
@UseGuards(AuthGuard, RolesGuard)
@Roles('editor', 'admin')
export class ContributorAdminController {
  constructor(
    private readonly service: ContributorService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private contextOf(request: Request): RequestContext {
    return requestContextOf(request, this.config.get('APP_SECRET', { infer: true }));
  }

  @Get()
  @adminHeaders()
  @ApiOperation({ summary: 'Isi kartu pembuat termasuk yang belum ditampilkan' })
  @ApiOkResponse({ description: 'Kartu pembuat saat ini' })
  current(): Promise<ContributorAdmin> {
    return this.service.current();
  }

  @Put()
  @writeRoute()
  @ApiOperation({ summary: 'Menyimpan kartu pembuat, membuat bila belum ada' })
  @ApiOkResponse({ description: 'Kartu pembuat setelah penyimpanan' })
  save(
    @Body(new ZodValidationPipe(ContributorInputSchema)) body: ContributorInput,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
  ): Promise<ContributorAdmin> {
    return this.service.save(body, session, this.contextOf(request));
  }
}