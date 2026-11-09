import { sql } from 'drizzle-orm';
import { boolean, check, integer, jsonb, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { createdAtColumn, updatedAtColumn } from './columns.js';

export type ContributorFocusJson = { title: string; body: string };

export const siteContributor = pgTable(
  'site_contributor',
  {
    id: uuid('id').primaryKey(),
    name: varchar('name', { length: 80 }).notNull(),
    nickname: varchar('nickname', { length: 32 }).notNull(),
    role: varchar('role', { length: 80 }).notNull(),
    className: varchar('class_name', { length: 40 }).notNull(),
    summary: varchar('summary', { length: 400 }).notNull(),
    focuses: jsonb('focuses').$type<ContributorFocusJson[]>().notNull().default([]),
    tools: jsonb('tools').$type<string[]>().notNull().default([]),
    isPublished: boolean('is_published').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  () => [
    check('ck_site_contributor_sort_order', sql`sort_order >= 0`),
    check('ck_site_contributor_focuses_array', sql`jsonb_typeof(focuses) = 'array'`),
    check('ck_site_contributor_tools_array', sql`jsonb_typeof(tools) = 'array'`),
    check('ck_site_contributor_summary', sql`char_length(btrim(summary)) >= 10`),
  ],
);

export type SiteContributorRow = typeof siteContributor.$inferSelect;

export type SiteContributorInsert = typeof siteContributor.$inferInsert;