import type { AuditAction, AuditEntityType, AuditEntry } from '@kelas/contracts';
import { toIsoInstant } from '../common/text/instant.js';
import type { AuditLogRow } from '../db/schema/audit-log.js';

export function toAuditEntry(row: AuditLogRow): AuditEntry {
  return {
    id: row.id,
    createdAt: toIsoInstant(row.createdAt),
    actorId: row.actorId,
    actorLabel: row.actorLabel,
    action: row.action as AuditAction,
    entityType: row.entityType as AuditEntityType,
    entityId: row.entityId,
    correlationId: row.correlationId,
  };
}