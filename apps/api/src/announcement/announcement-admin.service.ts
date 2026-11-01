import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AnnouncementAdminDetail,
  AnnouncementAdminListQuery,
  AnnouncementAdminPage,
  AnnouncementCategory,
  AnnouncementCreate,
  AnnouncementStatus,
  AnnouncementUpdate,
  PaginationMeta,
} from '@kelas/contracts';
import type { AuditEntryInput } from '../audit/audit.repository.js';
import { AuditRepository } from '../audit/audit.repository.js';
import type { RequestContext } from '../common/http/request-context.js';
import { excerptFromMarkdown } from '../common/text/excerpt.js';
import { slugVariant, slugify } from '../common/text/slug.js';
import type { SessionContext } from '../auth/auth.service.js';
import { DatabaseService } from '../db/database.service.js';
import { isUniqueViolation } from '../db/pg-error.js';
import { AnnouncementAdminRepository } from './announcement-admin.repository.js';
import type {
  AnnouncementAdminListRow,
  AnnouncementPatch,
} from './announcement-admin.repository.js';
import { toAdminDetail, toAdminList } from './announcement.mapper.js';
import { assertTransition } from './announcement-status.js';

const SLUG_ATTEMPTS = 5;

const DEFAULT_CATEGORY: AnnouncementCategory = 'umum';

const DRAFT_STATUS: AnnouncementStatus = 'draft';

const PUBLISHED_STATUS: AnnouncementStatus = 'published';

const NOT_FOUND_MESSAGE = 'Pengumuman tidak ditemukan.';

const VERSION_CONFLICT_MESSAGE =
  'Pengumuman sudah diubah oleh pengguna lain. Muat ulang lalu ulangi perubahan.';

const SLUG_CONFLICT_MESSAGE = 'Slug pengumuman sudah dipakai. Pilih slug lain.';

type TransitionAction = 'publish' | 'archive' | 'restore' | 'unpublish';

type WritePayload = Omit<AnnouncementCreate, 'slug'> & {
  excerpt: string;
  category: AnnouncementCategory;
};

type PatchPlan = { values: AnnouncementPatch; redirectFrom?: string };

function metaOf(page: number, perPage: number, total: number): PaginationMeta {
  return { page, perPage, total, totalPages: Math.ceil(total / perPage) };
}

function slugCandidatesOf(title: string, requested: string | undefined): string[] {
  if (requested !== undefined) {
    return [requested];
  }

  const base = slugify(title);

  return [
    base,
    ...Array.from({ length: SLUG_ATTEMPTS - 1 }, (_, index) => slugVariant(base, index + 2)),
  ];
}

function nextSlugOf(current: AnnouncementAdminListRow, input: AnnouncementUpdate): string {
  if (input.slug !== undefined) {
    return input.slug;
  }

  return input.title === undefined ? current.slug : slugify(input.title);
}

function patchOf(current: AnnouncementAdminListRow, input: AnnouncementUpdate): PatchPlan {
  const slug = nextSlugOf(current, input);
  const excerpt =
    input.excerpt ?? (input.body === undefined ? undefined : excerptFromMarkdown(input.body));

  return {
    values: {
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.body === undefined ? {} : { body: input.body }),
      ...(input.category === undefined ? {} : { category: input.category }),
      ...(excerpt === undefined ? {} : { excerpt }),
      ...(slug === current.slug ? {} : { slug }),
    },
    ...(slug === current.slug ? {} : { redirectFrom: current.slug }),
  };
}

@Injectable()
export class AnnouncementAdminService {
  constructor(
    private readonly repository: AnnouncementAdminRepository,
    private readonly audit: AuditRepository,
    private readonly database: DatabaseService,
  ) {}

  private auditOf(
    actor: SessionContext,
    context: RequestContext,
    action: string,
    entityId: string,
  ): AuditEntryInput {
    return {
      actorId: actor.userId,
      actorLabel: actor.username,
      action,
      entityType: 'announcement',
      entityId,
      ipHash: context.ipHash,
      correlationId: context.correlationId,
    };
  }

  private async tryInsert(
    slug: string,
    payload: WritePayload,
    actor: SessionContext,
    context: RequestContext,
  ): Promise<string | undefined> {
    try {
      return await this.database.db.transaction(async (tx) => {
        const created = await this.repository.insert(tx, {
          ...payload,
          slug,
          status: DRAFT_STATUS,
          authorId: actor.userId,
        });

        await this.audit.recordWithin(tx, this.auditOf(actor, context, 'create', created.id));

        return created.id;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return undefined;
      }

      throw error;
    }
  }

  async list(query: AnnouncementAdminListQuery): Promise<AnnouncementAdminPage> {
    const { rows, total } = await this.repository.findPage({
      page: query.page,
      perPage: query.perPage,
      status: query.status,
      category: query.kategori,
      search: query.q,
    });

    return {
      items: rows.map(toAdminList),
      meta: metaOf(query.page, query.perPage, total),
    };
  }

  async detail(id: string): Promise<AnnouncementAdminDetail> {
    const row = await this.repository.findById(id);

    if (row === undefined) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: NOT_FOUND_MESSAGE });
    }

    return toAdminDetail(row);
  }

  async create(
    input: AnnouncementCreate,
    actor: SessionContext,
    context: RequestContext,
  ): Promise<AnnouncementAdminDetail> {
    const payload: WritePayload = {
      title: input.title,
      body: input.body,
      excerpt: input.excerpt ?? excerptFromMarkdown(input.body),
      category: input.category ?? DEFAULT_CATEGORY,
    };

    for (const slug of slugCandidatesOf(input.title, input.slug)) {
      const id = await this.tryInsert(slug, payload, actor, context);

      if (id !== undefined) {
        return this.detail(id);
      }
    }

    throw new ConflictException({ code: 'CONFLICT', message: SLUG_CONFLICT_MESSAGE });
  }

  async update(
    id: string,
    input: AnnouncementUpdate,
    actor: SessionContext,
    context: RequestContext,
    expectedVersion: number | undefined,
  ): Promise<AnnouncementAdminDetail> {
    const current = await this.repository.findById(id);

    if (current === undefined) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: NOT_FOUND_MESSAGE });
    }

    const plan = patchOf(current, input);
    const updatedAt = new Date().toISOString();

    await this.database.db.transaction(async (tx) => {
      const applied = await this.repository.update(tx, id, expectedVersion, {
        ...plan.values,
        updatedAt,
      });

      if (applied === undefined) {
        throw new ConflictException({ code: 'CONFLICT', message: VERSION_CONFLICT_MESSAGE });
      }

      if (plan.redirectFrom !== undefined) {
        await this.repository.recordRedirect(tx, plan.redirectFrom, id);
        await this.repository.dropRedirect(tx, plan.values.slug ?? current.slug);
      }

      await this.audit.recordWithin(tx, this.auditOf(actor, context, 'update', id));
    });

    return this.detail(id);
  }

  private async changeStatus(
    id: string,
    target: AnnouncementStatus,
    action: TransitionAction,
    actor: SessionContext,
    context: RequestContext,
    expectedVersion: number | undefined,
  ): Promise<AnnouncementAdminDetail> {
    const current = await this.repository.findById(id);

    if (current === undefined) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: NOT_FOUND_MESSAGE });
    }

    assertTransition(current.status as AnnouncementStatus, target);

    const now = new Date().toISOString();
    const patch: AnnouncementPatch =
      target === PUBLISHED_STATUS
        ? { status: target, publishedAt: now, updatedAt: now }
        : { status: target, updatedAt: now };

    await this.database.db.transaction(async (tx) => {
      const applied = await this.repository.update(tx, id, expectedVersion, patch);

      if (applied === undefined) {
        throw new ConflictException({ code: 'CONFLICT', message: VERSION_CONFLICT_MESSAGE });
      }

      await this.audit.recordWithin(tx, this.auditOf(actor, context, action, id));
    });

    return this.detail(id);
  }

  publish(
    id: string,
    actor: SessionContext,
    context: RequestContext,
    expectedVersion: number | undefined,
  ): Promise<AnnouncementAdminDetail> {
    return this.changeStatus(id, PUBLISHED_STATUS, 'publish', actor, context, expectedVersion);
  }

  archive(
    id: string,
    actor: SessionContext,
    context: RequestContext,
    expectedVersion: number | undefined,
  ): Promise<AnnouncementAdminDetail> {
    return this.changeStatus(id, 'archived', 'archive', actor, context, expectedVersion);
  }

  restore(
    id: string,
    actor: SessionContext,
    context: RequestContext,
    expectedVersion: number | undefined,
  ): Promise<AnnouncementAdminDetail> {
    return this.changeStatus(id, DRAFT_STATUS, 'restore', actor, context, expectedVersion);
  }

  unpublish(
    id: string,
    actor: SessionContext,
    context: RequestContext,
    expectedVersion: number | undefined,
  ): Promise<AnnouncementAdminDetail> {
    return this.changeStatus(id, DRAFT_STATUS, 'unpublish', actor, context, expectedVersion);
  }
}