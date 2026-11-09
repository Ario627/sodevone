import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { createdAtColumn, updatedAtColumn } from './columns.js';

export const classMember = pgTable(
  'class_member',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    role: text('role').notNull().default('student'),
    fullName: varchar('full_name', { length: 80 }).notNull(),
    nickname: varchar('nickname', { length: 32 }).notNull(),
    hobby: varchar('hobby', { length: 48 }).notNull(),
    note: varchar('note', { length: 200 }).notNull(),
    sortOrder: integer('sort_order').notNull(),
    isPublished: boolean('is_published').notNull().default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index('idx_class_member_public').on(table.isPublished, table.sortOrder),
    check('ck_class_member_role', sql`role IN ('student', 'homeroom')`),
    check('ck_class_member_sort_order', sql`sort_order >= 0`),
    check('ck_class_member_full_name', sql`char_length(btrim(full_name)) >= 2`),
    check('ck_class_member_nickname', sql`char_length(btrim(nickname)) >= 2`),
    check('ck_class_member_hobby', sql`char_length(btrim(hobby)) >= 2`),
    check('ck_class_member_note', sql`char_length(btrim(note)) >= 2`),
  ],
);

export type ClassMemberRow = typeof classMember.$inferSelect;

export type ClassMemberInsert = typeof classMember.$inferInsert;