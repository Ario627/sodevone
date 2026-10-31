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
import { createdAtColumn } from './columns.js';
import { adminUser } from './admin-user.js';

export const adminSession = pgTable(
  'admin_session',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => adminUser.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    createdAt: createdAtColumn(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'string' }),
    ipHash: text('ip_hash'),
    userAgent: varchar('user_agent', { length: 255 }),
  },
  (table) => [
    uniqueIndex('uq_admin_session_token_hash').on(table.tokenHash),
    index('idx_admin_session_user').on(table.userId),
    index('idx_admin_session_expires').on(table.expiresAt),
    check('ck_admin_session_token_hash_length', sql`char_length(token_hash) = 64`),
    check('ck_admin_session_ip_hash_length', sql`ip_hash IS NULL OR char_length(ip_hash) = 64`),
    check('ck_admin_session_expires_after_created', sql`expires_at > created_at`),
  ],
);

export type AdminSessionRow = typeof adminSession.$inferSelect;

export type AdminSessionInsert = typeof adminSession.$inferInsert;