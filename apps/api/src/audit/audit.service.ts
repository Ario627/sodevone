import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuditEntry, AuditListQuery, AuditPage, PaginationMeta } from '@kelas/contracts';
import type { SessionContext } from '../auth/auth.service.js';
import { isWibDateRangeValid, wibDayEndUtc, wibDayStartUtc } from '../common/time/wib.js';
import { AuditRepository } from './audit.repository.js';
import { toAuditEntry } from './audit.mapper.js';

const OWN_ACTIVITY_ONLY_MESSAGE = 'Anda hanya dapat melihat aktivitas sendiri.';

const INVALID_RANGE_MESSAGE = 'Rentang tanggal tidak valid.';

function rangeError(): BadRequestException {
  return new BadRequestException({
    code: 'VALIDATION_FAILED',
    message: INVALID_RANGE_MESSAGE,
    fields: [{ path: 'to', message: 'Tanggal akhir tidak boleh lebih awal dari tanggal awal.' }],
  });
}

@Injectable()
export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  private scopeOf(query: AuditListQuery, session: SessionContext): string | undefined {
    if (session.role === 'admin') {
      return query.actorId;
    }

    if (query.actorId !== undefined && query.actorId !== session.userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: OWN_ACTIVITY_ONLY_MESSAGE });
    }

    return session.userId;
  }

  async list(query: AuditListQuery, session: SessionContext): Promise<AuditPage> {
    if (
      query.from !== undefined &&
      query.to !== undefined &&
      !isWibDateRangeValid(query.from, query.to)
    ) {
      throw rangeError();
    }

    const actorId = this.scopeOf(query, session);
    const { rows, total } = await this.repository.findPage({
      page: query.page,
      perPage: query.perPage,
      action: query.action,
      entityType: query.entityType,
      actorId,
      from: query.from === undefined ? undefined : wibDayStartUtc(query.from),
      to: query.to === undefined ? undefined : wibDayEndUtc(query.to),
    });

    const meta: PaginationMeta = {
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages: Math.ceil(total / query.perPage),
    };

    const items: AuditEntry[] = rows.map(toAuditEntry);

    return { items, meta };
  }
}