import {
  Body,
  Controller,
  Get,
  Header,
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
  AdminUserCreateSchema,
  AdminUserListQuerySchema,
  AdminUserUpdateSchema,
  UuidSchema,
  type AdminUser,
  type AdminUserCreate,
  type AdminUserListQuery,
  type AdminUserPage,
  type AdminUserUpdate,
} from '@kelas/contracts';
import type { Request, Response } from 'express';
import { AuthGuard, CurrentSession, Roles, RolesGuard } from '../auth/auth.guard.js';
import type { SessionContext } from '../auth/auth.service.js';
import type { RequestContext } from '../common/http/request-context.js';
import { requestContextOf } from '../common/http/request-context.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { Env } from '../config/env.js';
import { AdminUserService } from './admin-user.service.js';

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

@ApiTags('akun-admin')
@ApiCookieAuth('kelas_session')
@Controller('api/admin/users')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminUserController {
  constructor(
    private readonly service: AdminUserService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private contextOf(request: Request): RequestContext {
    return requestContextOf(request, this.config.get('APP_SECRET', { infer: true }));
  }

  @Get()
  @adminHeaders()
  @ApiOperation({ summary: 'Daftar akun pengelola' })
  @ApiOkResponse({ description: 'Daftar akun tanpa data kredensial' })
  list(
    @Query(new ZodValidationPipe(AdminUserListQuerySchema)) query: AdminUserListQuery,
  ): Promise<AdminUserPage> {
    return this.service.list(query);
  }

  @Post()
  @writeRoute()
  @ApiOperation({ summary: 'Membuat akun pengelola baru' })
  @ApiCreatedResponse({ description: 'Akun yang dibuat tanpa kata sandi' })
  async create(
    @Body(new ZodValidationPipe(AdminUserCreateSchema)) body: AdminUserCreate,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminUser> {
    const created = await this.service.create(body, session, this.contextOf(request));

    response.status(201);

    return created;
  }

  @Patch(':id')
  @writeRoute()
  @ApiOperation({ summary: 'Mengubah nama tampilan, peran, atau status akun' })
  @ApiParam({ name: 'id', description: 'UUID akun' })
  @ApiOkResponse({ description: 'Akun setelah perubahan' })
  update(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @Body(new ZodValidationPipe(AdminUserUpdateSchema)) body: AdminUserUpdate,
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
  ): Promise<AdminUser> {
    return this.service.update(id, body, session, this.contextOf(request));
  }
}