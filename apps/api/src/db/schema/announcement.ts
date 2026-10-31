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

export const announcement = pgTable(
  'announcements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 120 }).notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    excerpt: varchar('excerpt', { length: 320 }).notNull(),
    body: text('body').notNull(),
    category: text('category').notNull().default('umum'),
    status: text('status').notNull().default('draft'),
    visibility: text('visibility').notNull().default('public'),
    authorId: uuid('author_id')
      .notNull()
      .references(() => adminUser.id, { onDelete: 'restrict' }),
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'string' }),
    version: versionColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uq_announcements_slug').on(table.slug),
    index('idx_announcements_public')
      .on(table.status, table.publishedAt.desc())
      .where(sql`status = 'published'`),
    index('idx_announcements_category_public')
      .on(table.category, table.publishedAt.desc())
      .where(sql`status = 'published'`),
    index('idx_announcements_admin').on(table.status, table.updatedAt.desc()),
    index('idx_announcements_author').on(table.authorId),
    check('ck_announcements_version_positive', sql`version > 0`),
    check('ck_announcements_slug_format', sql`slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('ck_announcements_title_length', sql`char_length(title) >= 3`),
    check('ck_announcements_body_length', sql`char_length(body) >= 1`),
    check(
      'ck_announcements_category',
      sql`category IN ('akademik', 'kegiatan', 'administrasi', 'umum')`,
    ),
    check('ck_announcements_status', sql`status IN ('draft', 'published', 'archived')`),
    check('ck_announcements_visibility', sql`visibility IN ('public', 'internal')`),
    check(
      'ck_announcements_published_at_required',
      sql`status = 'draft' OR published_at IS NOT NULL`,
    ),
  ],
);

export type AnnouncementRow = typeof announcement.$inferSelect;

export type AnnouncementInsert = typeof announcement.$inferInsert;