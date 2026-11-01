import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, lt } from 'drizzle-orm';
import { DatabaseService } from '../db/database.service.js';
import { event } from '../db/schema/event.js';
import { slugRedirect } from '../db/schema/slug-redirect.js';

const PUBLISHED = 'published';

const ARCHIVED = 'archived';

const EVENT_RESOURCE = 'event';

const VISIBLE_STATUSES = [PUBLISHED, ARCHIVED] as const;

export type EventPublicRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  status: string;
};

const COLUMNS = {
  id: event.id,
  slug: event.slug,
  title: event.title,
  description: event.description,
  location: event.location,
  startsAt: event.startsAt,
  endsAt: event.endsAt,
  status: event.status,
};

@Injectable()
export class EventRepository {
  constructor(private readonly database: DatabaseService) {}

  async findUpcoming(now: string, limit: number): Promise<EventPublicRow[]> {
    return this.database.db
      .select(COLUMNS)
      .from(event)
      .where(and(eq(event.status, PUBLISHED), gte(event.startsAt, now)))
      .orderBy(asc(event.startsAt), asc(event.id))
      .limit(limit);
  }

  async findPast(now: string, limit: number): Promise<EventPublicRow[]> {
    return this.database.db
      .select(COLUMNS)
      .from(event)
      .where(and(eq(event.status, PUBLISHED), lt(event.startsAt, now)))
      .orderBy(desc(event.startsAt), asc(event.id))
      .limit(limit);
  }

  async findVisibleBySlug(slug: string): Promise<EventPublicRow | undefined> {
    const rows = await this.database.db
      .select(COLUMNS)
      .from(event)
      .where(and(eq(event.slug, slug), inArray(event.status, [...VISIBLE_STATUSES])))
      .limit(1);

    return rows[0];
  }

  async findVisibleById(id: string): Promise<EventPublicRow | undefined> {
    const rows = await this.database.db
      .select(COLUMNS)
      .from(event)
      .where(and(eq(event.id, id), inArray(event.status, [...VISIBLE_STATUSES])))
      .limit(1);

    return rows[0];
  }

  async findRedirectTargetId(slug: string): Promise<string | undefined> {
    const rows = await this.database.db
      .select({ resourceId: slugRedirect.resourceId })
      .from(slugRedirect)
      .where(and(eq(slugRedirect.oldSlug, slug), eq(slugRedirect.resourceType, EVENT_RESOURCE)))
      .limit(1);

    return rows[0]?.resourceId;
  }
}
