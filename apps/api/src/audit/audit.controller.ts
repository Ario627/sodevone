import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditListQuerySchema, type AuditListQuery, type AuditPage } from '@kelas/contracts';
import { AuthGuard, CurrentSession, Roles, RolesGuard } from '../auth/auth.guard.js';
import type { SessionContext } from '../auth/auth.service.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { AuditService } from './audit.service.js';

@ApiTags('audit')
@ApiCookieAuth('kelas_session')
@Controller('api/admin/audit')
@UseGuards(AuthGuard, RolesGuard)
@Roles('editor', 'admin')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Cookie')
  @Header('X-Robots-Tag', 'noindex')
  @ApiOperation({ summary: 'Riwayat aktivitas pengelola' })
  @ApiOkResponse({ description: 'Entri audit beserta meta paginasi' })
  list(
    @Query(new ZodValidationPipe(AuditListQuerySchema)) query: AuditListQuery,
    @CurrentSession() session: SessionContext,
  ): Promise<AuditPage> {
    return this.service.list(query, session);
  }
}