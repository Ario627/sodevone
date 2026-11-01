import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { searchTermsOf, wordBoundaryPatternOf } from '../common/text/search.js';
import { DatabaseService } from '../db/database.service.js';
import { announcement } from '../db/schema/announcement.js';
import { slugRedirect } from '../db/schema/slug-redirect.js';

const PUBLISHED = 'published';

const ARCHIVED = 'archived';

const ANNOUNCEMENT_RESOURCE = 'announcement';

const VISIBLE_STATUSES = [PUBLISHED, ARCHIVED] as const;

export type FindAnnouncementPageInput = {
  page: number;
  perPage: number;
  category?: string;
  search?: string;
  includeArchived: boolean;
};

export type AnnouncementPublicRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  status: string;
  publishedAt: string | null;
  updatedAt: string;
};

export type AnnouncementPage = { rows: AnnouncementPublicRow[]; total: number };

const COLUMNS = {
  id: announcement.id,
  slug: announcement.slug,
  title: announcement.title,
  excerpt: announcement.excerpt,
  body: announcement.body,
  category: announcement.category,
  status: announcement.status,
  publishedAt: announcement.publishedAt,
  updatedAt: announcement.updatedAt,
};

function termCondition(term: string) {
  const pattern = wordBoundaryPatternOf(term);

  return or(sql`${announcement.title} ~* ${pattern}`, sql`${announcement.body} ~* ${pattern}`);
}

function searchConditionOf(search: string | undefined) {
  const terms = search === undefined ? [] : searchTermsOf(search);

  return terms.length === 0 ? undefined : and(...terms.map(termCondition));
}

@Injectable()
export class AnnouncementRepository {
  constructor(private readonly database: DatabaseService) {}

  private conditionOf(input: FindAnnouncementPageInput) {
    return and(
      input.includeArchived
        ? inArray(announcement.status, [...VISIBLE_STATUSES])
        : eq(announcement.status, PUBLISHED),
      input.category === undefined ? undefined : eq(announcement.category, input.category),
      searchConditionOf(input.search),
    );
  }

  async findPage(input: FindAnnouncementPageInput): Promise<AnnouncementPage> {
    const where = this.conditionOf(input);
    const offset = (input.page - 1) * input.perPage;

    const [rows, totals] = await Promise.all([
      this.database.db
        .select(COLUMNS)
        .from(announcement)
        .where(where)
        .orderBy(desc(announcement.publishedAt), asc(announcement.id))
        .limit(input.perPage)
        .offset(offset),
      this.database.db.select({ value: count() }).from(announcement).where(where),
    ]);

    return { rows, total: totals[0]?.value ?? 0 };
  }

  async findVisibleBySlug(slug: string): Promise<AnnouncementPublicRow | undefined> {
    const rows = await this.database.db
      .select(COLUMNS)
      .from(announcement)
      .where(and(eq(announcement.slug, slug), inArray(announcement.status, [...VISIBLE_STATUSES])))
      .limit(1);

    return rows[0];
  }

  async findVisibleById(id: string): Promise<AnnouncementPublicRow | undefined> {
    const rows = await this.database.db
      .select(COLUMNS)
      .from(announcement)
      .where(and(eq(announcement.id, id), inArray(announcement.status, [...VISIBLE_STATUSES])))
      .limit(1);

    return rows[0];
  }

  async findRedirectTargetId(slug: string): Promise<string | undefined> {
    const rows = await this.database.db
      .select({ resourceId: slugRedirect.resourceId })
      .from(slugRedirect)
      .where(
        and(eq(slugRedirect.oldSlug, slug), eq(slugRedirect.resourceType, ANNOUNCEMENT_RESOURCE)),
      )
      .limit(1);

    return rows[0]?.resourceId;
  }
}
