import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { auditLog } from '../db/schema/audit-log.js';

export type AuditEntry = {
  actorId: string | null;
  actorLabel: string;
  action: string;
  entityType: string;
  entityId: string | null;
  ipHash: string | null;
  correlationId: string | null;
};

@Injectable()
export class AuditRepository {
  constructor(private readonly database: DatabaseService) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.database.db.insert(auditLog).values(entry);
  }
}