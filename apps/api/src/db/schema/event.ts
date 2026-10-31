import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { adminUser } from './admin-user.js';
import { createdAtColumn, updatedAtColumn, versionColumn } from './columns.js';

export const event = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 120 }).notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    description: text('description'),
    location: varchar('location', { length: 200 }),
    startsAt: timestamp('starts_at', { withTimezone: true, mode: 'string' }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true, mode: 'string' }),
    status: text('status').notNull().default('draft'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => adminUser.id, { onDelete: 'restrict' }),
    version: versionColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uq_events_slug').on(table.slug),
    index('idx_events_public').on(table.startsAt).where(sql`status = 'published'`),
    index('idx_events_admin').on(table.status, table.updatedAt.desc()),
    check('ck_events_version_positive', sql`version > 0`),
    check('ck_events_slug_format', sql`slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('ck_events_title_length', sql`char_length(title) >= 3`),
    check('ck_events_status', sql`status IN ('draft', 'published', 'archived')`),
    check('ck_events_end_after_start', sql`ends_at IS NULL OR ends_at >= starts_at`),
  ],
);

export type EventRow = typeof event.$inferSelect;

export type EventInsert = typeof event.$inferInsert;