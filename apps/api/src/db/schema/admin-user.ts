import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createdAtColumn, updatedAtColumn } from './columns.js';

export const adminUser = pgTable(
  'admin_user',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: varchar('username', { length: 64 }).notNull(),
    displayName: varchar('display_name', { length: 120 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull().default('editor'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    uniqueIndex('uq_admin_user_username').on(table.username),
    index('idx_admin_user_active').on(table.isActive).where(sql`is_active`),
    check('ck_admin_user_username_format', sql`username ~ '^[a-z0-9._-]{3,64}$'`),
    check('ck_admin_user_display_name_length', sql`char_length(display_name) >= 2`),
    check('ck_admin_user_role', sql`role IN ('admin', 'editor')`),
    check('ck_admin_user_password_argon2', sql`password_hash LIKE '$argon2%'`),
  ],
);

export type AdminUserRow = typeof adminUser.$inferSelect;

export type AdminUserInsert = typeof adminUser.$inferInsert;