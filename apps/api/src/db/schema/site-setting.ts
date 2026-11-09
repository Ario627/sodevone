import { sql } from 'drizzle-orm';
import { check, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { adminUser } from './admin-user.js';
import { updatedAtColumn } from './columns.js';

export const siteSetting = pgTable(
  'site_setting',
  {
    key: text('key').primaryKey(),
    value: jsonb('value').$type<Record<string, unknown>>().notNull(),
    updatedBy: uuid('updated_by').references(() => adminUser.id, { onDelete: 'set null' }),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    check('ck_site_setting_object', sql`jsonb_typeof(${table.value}) = 'object'`),
    check('ck_site_setting_key_length', sql`char_length(${table.key}) BETWEEN 1 AND 60`),
  ],
);

export type SiteSettingRow = typeof siteSetting.$inferSelect;

export type SiteSettingInsert = typeof siteSetting.$inferInsert;