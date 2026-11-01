import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, lte } from 'drizzle-orm';
import { DatabaseService } from '../db/database.service.js';
import type { Executor } from '../db/executor.js';
import { auditLog } from '../db/schema/audit-log.js';
import type { AuditLogRow } from '../db/schema/audit-log.js';

export type AuditEntryInput = {
  actorId: string | null;
  actorLabel: string;
  action: string;
  entityType: string;
  entityId: string | null;
  ipHash: string | null;
  correlationId: string | null;
};

export type FindAuditPageInput = {
  page: number;
  perPage: number;
  action?: string;
  entityType?: string;
  actorId?: string;
  from?: string;
  to?: string;
};

export type AuditLogPage = { rows: AuditLogRow[]; total: number };

@Injectable()
export class AuditRepository {
  constructor(private readonly database: DatabaseService) {}

  private conditionOf(input: FindAuditPageInput) {
    return and(
      input.action === undefined ? undefined : eq(auditLog.action, input.action),
      input.entityType === undefined ? undefined : eq(auditLog.entityType, input.entityType),
      input.actorId === undefined ? undefined : eq(auditLog.actorId, input.actorId),
      input.from === undefined ? undefined : gte(auditLog.createdAt, input.from),
      input.to === undefined ? undefined : lte(auditLog.createdAt, input.to),
    );
  }

  async record(entry: AuditEntryInput): Promise<void> {
    await this.database.db.insert(auditLog).values(entry);
  }

  async recordWithin(exec: Executor, entry: AuditEntryInput): Promise<void> {
    await exec.insert(auditLog).values(entry);
  }

  async findPage(input: FindAuditPageInput): Promise<AuditLogPage> {
    const where = this.conditionOf(input);
    const offset = (input.page - 1) * input.perPage;

    const [rows, totals] = await Promise.all([
      this.database.db
        .select()
        .from(auditLog)
        .where(where)
        .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
        .limit(input.perPage)
        .offset(offset),
      this.database.db.select({ value: count() }).from(auditLog).where(where),
    ]);

    return { rows, total: totals[0]?.value ?? 0 };
  }
}