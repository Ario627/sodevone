import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../db/database.service.js';
import type { Executor } from '../db/executor.js';
import { adminUser } from '../db/schema/admin-user.js';
import { event } from '../db/schema/event.js';
import type { EventInsert } from '../db/schema/event.js';
import { dropSlugRedirect, recordSlugRedirect } from '../db/slug-redirect.js';

export type FindEventAdminPageInput = {
  page: number;
  perPage: number;
  status?: string;
};

export type EventAdminListRow = {
  id: string;
  slug: string;
  title: string;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  status: string;
  authorName: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type EventAdminRow = EventAdminListRow & { description: string | null };

export type EventAdminPage = { rows: EventAdminListRow[]; total: number };

export type EventPatch = Partial<EventInsert>;

const LIST_COLUMNS = {
  id: event.id,
  slug: event.slug,
  title: event.title,
  location: event.location,
  startsAt: event.startsAt,
  endsAt: event.endsAt,
  status: event.status,
  authorName: adminUser.displayName,
  version: event.version,
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
};

const DETAIL_COLUMNS = { ...LIST_COLUMNS, description: event.description };

function versionConditionOf(expectedVersion: number | undefined) {
  return expectedVersion === undefined ? undefined : eq(event.version, expectedVersion);
}

@Injectable()
export class EventAdminRepository {
  constructor(private readonly database: DatabaseService) {}

  async findPage(input: FindEventAdminPageInput): Promise<EventAdminPage> {
    const where = input.status === undefined ? undefined : eq(event.status, input.status);
    const offset = (input.page - 1) * input.perPage;

    const [rows, totals] = await Promise.all([
      this.database.db
        .select(LIST_COLUMNS)
        .from(event)
        .innerJoin(adminUser, eq(adminUser.id, event.createdBy))
        .where(where)
        .orderBy(desc(event.updatedAt), asc(event.id))
        .limit(input.perPage)
        .offset(offset),
      this.database.db.select({ value: count() }).from(event).where(where),
    ]);

    return { rows, total: totals[0]?.value ?? 0 };
  }

  async findById(exec: Executor, id: string): Promise<EventAdminRow | undefined> {
    const rows = await exec
      .select(DETAIL_COLUMNS)
      .from(event)
      .innerJoin(adminUser, eq(adminUser.id, event.createdBy))
      .where(eq(event.id, id))
      .limit(1);

    return rows[0];
  }

  async insert(exec: Executor, values: EventInsert): Promise<{ id: string }> {
    const rows = await exec.insert(event).values(values).returning({ id: event.id });
    const row = rows[0];

    if (row === undefined) {
      throw new Error('Baris kegiatan tidak dikembalikan setelah penyimpanan');
    }

    return row;
  }

  async update(
    exec: Executor,
    id: string,
    expectedVersion: number | undefined,
    patch: EventPatch,
  ): Promise<{ id: string } | undefined> {
    const rows = await exec
      .update(event)
      .set({ ...patch, version: sql`${event.version} + 1` })
      .where(and(eq(event.id, id), versionConditionOf(expectedVersion)))
      .returning({ id: event.id });

    return rows[0];
  }

  async recordRedirect(exec: Executor, oldSlug: string, resourceId: string): Promise<void> {
    await recordSlugRedirect(exec, 'event', oldSlug, resourceId);
  }

  async dropRedirect(exec: Executor, slug: string): Promise<void> {
    await dropSlugRedirect(exec, slug);
  }
}