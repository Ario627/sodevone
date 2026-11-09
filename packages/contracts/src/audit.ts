import { z } from 'zod';
import { IsoDateSchema, IsoDateTimeSchema, UuidSchema, paginatedSchema } from './common.js';
import { PageParamSchema, PerPageAdminSchema } from './query.js';

export const AuditActionSchema = z.enum([
  'create',
  'update',
  'publish',
  'archive',
  'restore',
  'unpublish',
  'pin',
  'unpin',
  'delete',
  'upload',
  'login_success',
  'login_failed',
  'logout',
  'session_revoked',
  'user_created',
  'user_deactivated',
]);

export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AuditEntityTypeSchema = z.enum([
  'announcement',
  'event',
  'album',
  'image',
  'user',
  'session',
  'social',
  'member',
  'contributor',
  'attachment',
  'setting',
]);

export type AuditEntityType = z.infer<typeof AuditEntityTypeSchema>;

export const AuditEntrySchema = z.object({
  id: z.number().int().nonnegative(),
  createdAt: IsoDateTimeSchema,
  actorId: UuidSchema.nullable(),
  actorLabel: z.string().min(1).max(120),
  action: AuditActionSchema,
  entityType: AuditEntityTypeSchema,
  entityId: UuidSchema.nullable(),
  correlationId: z.string().min(8).max(64).nullable(),
});

export type AuditEntry = z.infer<typeof AuditEntrySchema>;

export const AuditListQuerySchema = z.strictObject({
  page: PageParamSchema,
  perPage: PerPageAdminSchema,
  action: AuditActionSchema.optional(),
  entityType: AuditEntityTypeSchema.optional(),
  actorId: UuidSchema.optional(),
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
});

export type AuditListQuery = z.infer<typeof AuditListQuerySchema>;

export const AuditPageSchema = paginatedSchema(AuditEntrySchema);

export type AuditPage = z.infer<typeof AuditPageSchema>;
