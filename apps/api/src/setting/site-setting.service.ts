import { Injectable } from '@nestjs/common';
import {
  DEFAULT_VOXEL_BOARD,
  VoxelBoardSchema,
  type SiteSetting,
  type SiteSettingAdmin,
  type VoxelBoard,
  type VoxelBoardInput,
} from '@kelas/contracts';
import { AuditRepository } from '../audit/audit.repository.js';
import type { AuditEntryInput } from '../audit/audit.repository.js';
import type { SessionContext } from '../auth/auth.service.js';
import { collectionEtagOf } from '../common/http/collection-etag.js';
import type { RequestContext } from '../common/http/request-context.js';
import { toIsoInstant } from '../common/text/instant.js';
import { DatabaseService } from '../db/database.service.js';
import { SiteSettingRepository } from './site-setting.repository.js';

export const VOXEL_BOARD_KEY = 'voxel-board';

@Injectable()
export class SiteSettingService {
  constructor(
    private readonly repository: SiteSettingRepository,
    private readonly audit: AuditRepository,
    private readonly database: DatabaseService,
  ) {}

  private auditOf(actor: SessionContext, context: RequestContext): AuditEntryInput {
    return {
      actorId: actor.userId,
      actorLabel: actor.username,
      action: 'update',
      entityType: 'setting',
      entityId: null,
      ipHash: context.ipHash,
      correlationId: context.correlationId,
    };
  }

  private voxelBoardOf(value: Record<string, unknown> | undefined): VoxelBoard {
    if (value === undefined) {
      return DEFAULT_VOXEL_BOARD;
    }

    const parsed = VoxelBoardSchema.safeParse(value);

    return parsed.success ? parsed.data : DEFAULT_VOXEL_BOARD;
  }

  async publicSettings(): Promise<{ settings: SiteSetting; etag: string }> {
    const row = await this.repository.find(VOXEL_BOARD_KEY);
    const voxelBoard = this.voxelBoardOf(row?.value);

    return {
      settings: {
        voxelBoard,
        updatedAt: row === undefined ? null : toIsoInstant(row.updatedAt),
      },
      etag: collectionEtagOf(row?.updatedAt, row === undefined ? 0 : 1),
    };
  }

  async adminSettings(): Promise<SiteSettingAdmin> {
    return (await this.publicSettings()).settings;
  }

  async saveVoxelBoard(
    input: VoxelBoardInput,
    actor: SessionContext,
    context: RequestContext,
  ): Promise<SiteSettingAdmin> {
    await this.database.db.transaction(async (tx) => {
      await this.repository.upsert(tx, VOXEL_BOARD_KEY, { ...input.voxelBoard }, actor.userId);
      await this.audit.recordWithin(tx, this.auditOf(actor, context));
    });

    return this.adminSettings();
  }

  async resetVoxelBoard(actor: SessionContext, context: RequestContext): Promise<SiteSettingAdmin> {
    await this.database.db.transaction(async (tx) => {
      await this.repository.remove(tx, VOXEL_BOARD_KEY);
      await this.audit.recordWithin(tx, this.auditOf(actor, context));
    });

    return this.adminSettings();
  }
}