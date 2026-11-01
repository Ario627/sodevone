import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, or, sql } from 'drizzle-orm';
import { searchTermsOf, wordBoundaryPatternOf } from '../common/text/search.js';
import { DatabaseService } from '../db/database.service.js';
import type { Transaction } from '../db/executor.js';
import { adminUser } from '../db/schema/admin-user.js';
import { announcement } from '../db/schema/announcement.js';
import type { AnnouncementInsert } from '../db/schema/announcement.js';
import { slugRedirect } from '../db/schema/slug-redirect.js';

const ANNOUNCEMENT_RESOURCE = 'announcement';

export type FindAdminPageInput = {
  page: number;
  perPage: number;
  status?: string;
  category?: string;
  search?: string;
};

export type AnnouncementAdminListRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  status: string;
  authorId: string;
  authorName: string;
  version: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AnnouncementAdminDetailRow = AnnouncementAdminListRow & { body: string };

export type AnnouncementAdminPage = { rows: AnnouncementAdminListRow[]; total: number };

export type AnnouncementPatch = Partial<AnnouncementInsert>;

const LIST_COLUMNS = {
  id: announcement.id,
  slug: announcement.slug,
  title: announcement.title,
  excerpt: announcement.excerpt,
  category: announcement.category,
  status: announcement.status,
  authorId: announcement.authorId,
  authorName: adminUser.displayName,
  version: announcement.version,
  publishedAt: announcement.publishedAt,
  createdAt: announcement.createdAt,
  updatedAt: announcement.updatedAt,
};

const DETAIL_COLUMNS = { ...LIST_COLUMNS, body: announcement.body };

function termCondition(term: string) {
  const pattern = wordBoundaryPatternOf(term);

  return or(sql`${announcement.title} ~* ${pattern}`, sql`${announcement.body} ~* ${pattern}`);
}

function searchConditionOf(search: string | undefined) {
  const terms = search === undefined ? [] : searchTermsOf(search);

  return terms.length === 0 ? undefined : and(...terms.map(termCondition));
}

function versionConditionOf(expectedVersion: number | undefined) {
  return expectedVersion === undefined ? undefined : eq(announcement.version, expectedVersion);
}

@Injectable()
export class AnnouncementAdminRepository {
  constructor(private readonly database: DatabaseService) {}

  private conditionOf(input: FindAdminPageInput) {
    return and(
      input.status === undefined ? undefined : eq(announcement.status, input.status),
      input.category === undefined ? undefined : eq(announcement.category, input.category),
      searchConditionOf(input.search),
    );
  }

  async findPage(input: FindAdminPageInput): Promise<AnnouncementAdminPage> {
    const where = this.conditionOf(input);
    const offset = (input.page - 1) * input.perPage;

    const [rows, totals] = await Promise.all([
      this.database.db
        .select(LIST_COLUMNS)
        .from(announcement)
        .innerJoin(adminUser, eq(adminUser.id, announcement.authorId))
        .where(where)
        .orderBy(desc(announcement.updatedAt), asc(announcement.id))
        .limit(input.perPage)
        .offset(offset),
      this.database.db.select({ value: count() }).from(announcement).where(where),
    ]);

    return { rows, total: totals[0]?.value ?? 0 };
  }

  async findById(id: string): Promise<AnnouncementAdminDetailRow | undefined> {
    const rows = await this.database.db
      .select(DETAIL_COLUMNS)
      .from(announcement)
      .innerJoin(adminUser, eq(adminUser.id, announcement.authorId))
      .where(eq(announcement.id, id))
      .limit(1);

    return rows[0];
  }

  async insert(tx: Transaction, values: AnnouncementInsert): Promise<{ id: string }> {
    const rows = await tx.insert(announcement).values(values).returning({ id: announcement.id });
    const row = rows[0];

    if (row === undefined) {
      throw new Error('Baris pengumuman tidak dikembalikan setelah penyimpanan');
    }

    return row;
  }

  async update(
    tx: Transaction,
    id: string,
    expectedVersion: number | undefined,
    patch: AnnouncementPatch,
  ): Promise<{ id: string } | undefined> {
    const rows = await tx
      .update(announcement)
      .set({ ...patch, version: sql`${announcement.version} + 1` })
      .where(and(eq(announcement.id, id), versionConditionOf(expectedVersion)))
      .returning({ id: announcement.id });

    return rows[0];
  }

  async recordRedirect(tx: Transaction, oldSlug: string, resourceId: string): Promise<void> {
    await tx
      .insert(slugRedirect)
      .values({ oldSlug, resourceType: ANNOUNCEMENT_RESOURCE, resourceId })
      .onConflictDoUpdate({
        target: slugRedirect.oldSlug,
        set: { resourceType: ANNOUNCEMENT_RESOURCE, resourceId, createdAt: sql`now()` },
      });
  }

  async dropRedirect(tx: Transaction, slug: string): Promise<void> {
    await tx.delete(slugRedirect).where(eq(slugRedirect.oldSlug, slug));
  }
}