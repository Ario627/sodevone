import { Injectable, NotFoundException } from '@nestjs/common';
import type { Contributor, ContributorAdmin, ContributorInput } from '@kelas/contracts';
import { AuditRepository } from '../audit/audit.repository.js';
import type { AuditEntryInput } from '../audit/audit.repository.js';
import type { SessionContext } from '../auth/auth.service.js';
import { collectionEtagOf } from '../common/http/collection-etag.js';
import type { RequestContext } from '../common/http/request-context.js';
import { DatabaseService } from '../db/database.service.js';
import type { SiteContributorInsert } from '../db/schema/site-contributor.js';
import { ContributorRepository, PRIMARY_CONTRIBUTOR_ID } from './contributor.repository.js';
import { toContributor, toContributorAdmin } from './contributor.mapper.js';

const NOT_SET_MESSAGE = 'Kartu pembuat belum diisi.';

const SINGLE_CARD = 1;

function insertOf(input: ContributorInput): SiteContributorInsert {
  return {
    id: PRIMARY_CONTRIBUTOR_ID,
    name: input.name,
    nickname: input.nickname,
    role: input.role,
    className: input.className,
    summary: input.summary,
    focuses: input.focuses,
    tools: input.tools,
    isPublished: input.isPublished,
  };
}

@Injectable()
export class ContributorService {
  constructor(
    private readonly repository: ContributorRepository,
    private readonly audit: AuditRepository,
    private readonly database: DatabaseService,
  ) {}

  private auditOf(actor: SessionContext, context: RequestContext): AuditEntryInput {
    return {
      actorId: actor.userId,
      actorLabel: actor.username,
      action: 'update',
      entityType: 'contributor',
      entityId: PRIMARY_CONTRIBUTOR_ID,
      ipHash: context.ipHash,
      correlationId: context.correlationId,
    };
  }

  async published(): Promise<{ contributor: Contributor; etag: string } | null> {
    const row = await this.repository.findById(PRIMARY_CONTRIBUTOR_ID);

    if (row === undefined || !row.isPublished) {
      return null;
    }

    return {
      contributor: toContributor(row),
      etag: collectionEtagOf(row.updatedAt, SINGLE_CARD),
    };
  }

  async current(): Promise<ContributorAdmin> {
    const row = await this.repository.findById(PRIMARY_CONTRIBUTOR_ID);

    if (row === undefined) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: NOT_SET_MESSAGE });
    }

    return toContributorAdmin(row);
  }

  async save(
    input: ContributorInput,
    actor: SessionContext,
    context: RequestContext,
  ): Promise<ContributorAdmin> {
    await this.database.db.transaction(async (tx) => {
      await this.repository.upsert(tx, insertOf(input));
      await this.audit.recordWithin(tx, this.auditOf(actor, context));
    });

    return this.current();
  }
}