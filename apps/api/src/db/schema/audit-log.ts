import { sql } from 'drizzle-orm';
import { bigserial, check, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

const literalList = (values: readonly string[]) =>
  sql.raw(values.map((value) => `'${value}'`).join(', '));

export const AUDIT_ACTIONS = [
  'create',
  'update',
  'publish',
  'archive',
  'restore',
  'delete',
  'upload',
  'login_success',
  'login_failed',
  'logout',
  'session_revoked',
  'user_created',
  'user_deactivated',
] as const;

export const AUDIT_ENTITY_TYPES = [
  'announcement',
  'event',
  'album',
  'image',
  'user',
  'session',
] as const;

export const auditLog = pgTable(
  'audit_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    actorId: uuid('actor_id'),
    actorLabel: varchar('actor_label', { length: 120 }).notNull(),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id'),
    ipHash: text('ip_hash'),
    correlationId: varchar('correlation_id', { length: 64 }),
  },
  (table) => [
    index('idx_audit_created').on(table.createdAt.desc()),
    index('idx_audit_actor').on(table.actorId, table.createdAt.desc()),
    index('idx_audit_entity').on(table.entityType, table.entityId),
    check('ck_audit_log_action', sql`action IN (${literalList(AUDIT_ACTIONS)})`),
    check('ck_audit_log_entity_type', sql`entity_type IN (${literalList(AUDIT_ENTITY_TYPES)})`),
    check('ck_audit_log_actor_label_length', sql`char_length(actor_label) >= 1`),
    check('ck_audit_log_ip_hash_length', sql`ip_hash IS NULL OR char_length(ip_hash) = 64`),
  ],
);

export type AuditLogRow = typeof auditLog.$inferSelect;

export type AuditLogInsert = typeof auditLog.$inferInsert;