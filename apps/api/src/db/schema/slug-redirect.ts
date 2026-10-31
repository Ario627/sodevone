import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { createdAtColumn } from './columns.js';

export const slugRedirect = pgTable(
  'slug_redirect',
  {
    oldSlug: varchar('old_slug', { length: 120 }).primaryKey(),
    resourceType: text('resource_type').notNull(),
    resourceId: uuid('resource_id').notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index('idx_slug_redirect_resource').on(table.resourceType, table.resourceId),
    check(
      'ck_slug_redirect_resource_type',
      sql`resource_type IN ('announcement', 'album', 'event')`,
    ),
    check('ck_slug_redirect_slug_format', sql`old_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  ],
);

export type SlugRedirectRow = typeof slugRedirect.$inferSelect;

export type SlugRedirectInsert = typeof slugRedirect.$inferInsert;