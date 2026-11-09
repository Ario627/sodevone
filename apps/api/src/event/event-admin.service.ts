import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  EventAdminDetail,
  EventAdminListQuery,
  EventAdminPage,
  EventCreate,
  EventStatus,
  EventUpdate,
  PaginationMeta,
} from '@kelas/contracts';
import { AuditRepository } from '../audit/audit.repository.js';
import type { AuditEntryInput } from '../audit/audit.repository.js';
import type { SessionContext } from '../auth/auth.service.js';
import type { RequestContext } from '../common/http/request-context.js';
import { toIsoInstant } from '../common/text/instant.js';
import { slugVariant, slugify } from '../common/text/slug.js';
import { DatabaseService } from '../db/database.service.js';
import type { Executor } from '../db/executor.js';
import { isUniqueViolation } from '../db/pg-error.js';
import { EventAdminRepository } from './event-admin.repository.js';
import type { EventAdminRow, EventPatch } from './event-admin.repository.js';
import { assertEventSchedule } from './event-schedule.js';
import { assertEventTransition } from './event-status.js';
import { EventImageRepository } from './event-image.repository.js';
import { toEventAdminDetail, toEventAdminList, toEventPhotos } from './event.mapper.js';

const DRAFT_STATUS: EventStatus = 'draft';

const PUBLISHED_STATUS: EventStatus = 'published';

const ARCHIVED_STATUS: EventStatus = 'archived';

const SLUG_ATTEMPTS = 5;

const NOT_FOUND_MESSAGE = 'Kegiatan tidak ditemukan.';

const SLUG_CONFLICT_MESSAGE = 'Slug kegiatan sudah dipakai. Pilih slug lain.';

const VERSION_CONFLICT_MESSAGE =
  'Kegiatan sudah diubah oleh pengguna lain. Muat ulang lalu ulangi perubahan.';

type TransitionAction = 'publish' | 'archive' | 'restore';

type PatchPlan = {
  values: EventPatch;
  startsAt: string;
  endsAt: string | null;
  redirectFrom?: string;
};

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

function nextSlugOf(current: EventAdminRow, input: EventUpdate): string {
  if (input.slug !== undefined) {
    return input.slug;
  }

  return input.title === undefined ? current.slug : slugify(input.title);
}

function scheduleOf(
  current: EventAdminRow,
  input: EventUpdate,
): { startsAt: string; endsAt: string | null } {
  const startsAt = input.startsAt === undefined ? current.startsAt : input.startsAt;
  const endsAt =
    input.endsAt === undefined ? current.endsAt : input.endsAt === null ? null : input.endsAt;

  return { startsAt: toIsoInstant(startsAt), endsAt };
}

function patchOf(current: EventAdminRow, input: EventUpdate): PatchPlan {
  const slug = nextSlugOf(current, input);
  const schedule = scheduleOf(current, input);

  return {
    startsAt: schedule.startsAt,
    endsAt: schedule.endsAt,
    values: {
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.description === undefined ? {} : { description: input.description }),
      ...(input.location === undefined ? {} : { location: input.location }),
      ...(input.startsAt === undefined ? {} : { startsAt: schedule.startsAt }),
      ...(input.endsAt === undefined ? {} : { endsAt: schedule.endsAt }),
      ...(slug === current.slug ? {} : { slug }),
    },
    ...(slug === current.slug ? {} : { redirectFrom: current.slug }),
  };
}

function statusPatchOf(target: EventStatus, now: string): EventPatch {
  return { status: target, updatedAt: now };
}

@Injectable()
export class EventAdminService {
  constructor(
    private readonly repository: EventAdminRepository,
    private readonly images: EventImageRepository,
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
      entityType: 'event',
      entityId,
      ipHash: context.ipHash,
      correlationId: context.correlationId,
    };
  }

  private async requireEvent(exec: Executor, id: string): Promise<EventAdminRow> {
    const row = await this.repository.findById(exec, id);

    if (row === undefined) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: NOT_FOUND_MESSAGE });
    }

    return row;
  }

  async list(query: EventAdminListQuery): Promise<EventAdminPage> {
    const { rows, total } = await this.repository.findPage({
      page: query.page,
      perPage: query.perPage,
      status: query.status,
    });

    const counts = await this.images.countPhotos(rows.map((row) => row.id));

    return {
      items: rows.map((row) => toEventAdminList(row, counts.get(row.id) ?? 0)),
      meta: metaOf(query.page, query.perPage, total),
    };
  }

  async detail(id: string): Promise<EventAdminDetail> {
    const row = await this.requireEvent(this.database.db, id);
    const photos = toEventPhotos(await this.images.findPhotos(id, false));

    return toEventAdminDetail(row, photos.length, photos);
  }

  async create(
    input: EventCreate,
    actor: SessionContext,
    context: RequestContext,
  ): Promise<EventAdminDetail> {
    const startsAt = toIsoInstant(input.startsAt);
    const endsAt =
      input.endsAt === undefined || input.endsAt === null ? null : toIsoInstant(input.endsAt);

    assertEventSchedule(startsAt, endsAt);

    for (const slug of slugCandidatesOf(input.title, input.slug)) {
      try {
        const createdId = await this.database.db.transaction(async (tx) => {
          const created = await this.repository.insert(tx, {
            slug,
            title: input.title,
            description: input.description ?? null,
            location: input.location ?? null,
            startsAt,
            endsAt,
            status: DRAFT_STATUS,
            createdBy: actor.userId,
          });

          await this.audit.recordWithin(tx, this.auditOf(actor, context, 'create', created.id));

          return created.id;
        });

        return this.detail(createdId);
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
      }
    }

    throw new ConflictException({ code: 'CONFLICT', message: SLUG_CONFLICT_MESSAGE });
  }

  async update(
    id: string,
    input: EventUpdate,
    actor: SessionContext,
    context: RequestContext,
    expectedVersion: number | undefined,
  ): Promise<EventAdminDetail> {
    const current = await this.requireEvent(this.database.db, id);
    const plan = patchOf(current, input);

    assertEventSchedule(plan.startsAt, plan.endsAt);

    try {
      await this.database.db.transaction(async (tx) => {
        const applied = await this.repository.update(tx, id, expectedVersion, {
          ...plan.values,
          updatedAt: new Date().toISOString(),
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
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({ code: 'CONFLICT', message: SLUG_CONFLICT_MESSAGE });
      }

      throw error;
    }

    return this.detail(id);
  }

  private async changeStatus(
    id: string,
    target: EventStatus,
    action: TransitionAction,
    actor: SessionContext,
    context: RequestContext,
    expectedVersion: number | undefined,
  ): Promise<EventAdminDetail> {
    const current = await this.requireEvent(this.database.db, id);

    assertEventTransition(current.status as EventStatus, target);

    const now = new Date().toISOString();

    await this.database.db.transaction(async (tx) => {
      const applied = await this.repository.update(
        tx,
        id,
        expectedVersion,
        statusPatchOf(target, now),
      );

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
  ): Promise<EventAdminDetail> {
    return this.changeStatus(id, PUBLISHED_STATUS, 'publish', actor, context, expectedVersion);
  }

  archive(
    id: string,
    actor: SessionContext,
    context: RequestContext,
    expectedVersion: number | undefined,
  ): Promise<EventAdminDetail> {
    return this.changeStatus(id, ARCHIVED_STATUS, 'archive', actor, context, expectedVersion);
  }

  restore(
    id: string,
    actor: SessionContext,
    context: RequestContext,
    expectedVersion: number | undefined,
  ): Promise<EventAdminDetail> {
    return this.changeStatus(id, DRAFT_STATUS, 'restore', actor, context, expectedVersion);
  }
  async setImages(
    id: string,
    imageIds: string[],
    actor: SessionContext,
    context: RequestContext,
  ): Promise<EventAdminDetail> {
    await this.requireEvent(this.database.db, id);

    const unique = new Set(imageIds);

    if (unique.size !== imageIds.length) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Daftar foto memuat gambar yang sama lebih dari sekali.',
        fields: [{ path: 'imageIds', message: 'Gambar tidak boleh berulang.' }],
      });
    }

    const known = await this.images.findKnownAlbumImages(imageIds);
    const missing = imageIds.filter((imageId) => !known.has(imageId));

    if (missing.length > 0) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Ada foto yang tidak ditemukan atau albumnya belum terbit.',
        fields: [{ path: 'imageIds', message: `Tidak dikenal: ${missing.join(', ')}` }],
      });
    }

    await this.database.db.transaction(async (tx) => {
      await this.images.replaceAll(tx, id, imageIds);
      await this.audit.recordWithin(tx, this.auditOf(actor, context, 'update', id));
    });

    return this.detail(id);
  }
}
