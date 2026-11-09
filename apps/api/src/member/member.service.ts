import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  MemberAdminList,
  MemberCollection,
  MemberInput,
  MemberRoster,
} from '@kelas/contracts';
import { AuditRepository } from '../audit/audit.repository.js';
import type { AuditEntryInput } from '../audit/audit.repository.js';
import type { SessionContext } from '../auth/auth.service.js';
import { collectionEtagOf } from '../common/http/collection-etag.js';
import type { RequestContext } from '../common/http/request-context.js';
import { DatabaseService } from '../db/database.service.js';
import type { ClassMemberInsert } from '../db/schema/class-member.js';
import { ClassMemberRepository } from './class-member.repository.js';
import { toMemberAdminList, toMemberCollection } from './class-member.mapper.js';

const MULTIPLE_HOMEROOM_MESSAGE = 'Hanya boleh ada satu wali kelas pada daftar anggota.';

function assertSingleHomeroom(items: MemberInput[]): void {
  const homeroom = items.filter((item) => item.role === 'homeroom');

  if (homeroom.length > 1) {
    throw new BadRequestException({
      code: 'VALIDATION_FAILED',
      message: MULTIPLE_HOMEROOM_MESSAGE,
      fields: [{ path: 'items', message: MULTIPLE_HOMEROOM_MESSAGE }],
    });
  }
}

function insertRowsOf(items: MemberInput[]): ClassMemberInsert[] {
  return items.map((item, index) => ({
    role: item.role,
    fullName: item.fullName,
    nickname: item.nickname,
    hobby: item.hobby,
    note: item.note,
    sortOrder: index,
    isPublished: item.isPublished,
  }));
}

@Injectable()
export class MemberService {
  constructor(
    private readonly database: DatabaseService,
    private readonly repository: ClassMemberRepository,
    private readonly audit: AuditRepository,
  ) {}

  private auditOf(actor: SessionContext, context: RequestContext): AuditEntryInput {
    return {
      actorId: actor.userId,
      actorLabel: actor.username,
      action: 'update',
      entityType: 'member',
      entityId: null,
      ipHash: context.ipHash,
      correlationId: context.correlationId,
    };
  }

  async collection(): Promise<{ items: MemberCollection['items']; etag: string }> {
    const [rows, fingerprint] = await Promise.all([
      this.repository.findPublished(),
      this.repository.fingerprint(),
    ]);

    return {
      items: toMemberCollection(rows),
      etag: collectionEtagOf(fingerprint.latest, fingerprint.count),
    };
  }

  async roster(): Promise<MemberAdminList> {
    return { items: toMemberAdminList(await this.repository.findMany()) };
  }

  async replace(
    input: MemberRoster,
    actor: SessionContext,
    context: RequestContext,
  ): Promise<MemberAdminList> {
    assertSingleHomeroom(input.items);

    const rows = insertRowsOf(input.items);

    await this.database.db.transaction(async (tx) => {
      await this.repository.replaceAll(tx, rows);
      await this.audit.recordWithin(tx, this.auditOf(actor, context));
    });

    return this.roster();
  }
}
