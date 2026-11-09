import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../db/database.service.js';
import type { Executor } from '../db/executor.js';
import { siteSetting } from '../db/schema/site-setting.js';
import type { SiteSettingRow } from '../db/schema/site-setting.js';

export type SettingValue = Record<string, unknown>;

@Injectable()
export class SiteSettingRepository {
  constructor(private readonly database: DatabaseService) {}

  async find(key: string): Promise<SiteSettingRow | undefined> {
    const rows = await this.database.db
      .select()
      .from(siteSetting)
      .where(eq(siteSetting.key, key))
      .limit(1);

    return rows[0];
  }

  async upsert(exec: Executor, key: string, value: SettingValue, actorId: string): Promise<void> {
    const now = new Date().toISOString();

    await exec
      .insert(siteSetting)
      .values({ key, value, updatedBy: actorId, updatedAt: now })
      .onConflictDoUpdate({
        target: siteSetting.key,
        set: { value, updatedBy: actorId, updatedAt: now },
      });
  }

  async remove(exec: Executor, key: string): Promise<void> {
    await exec.delete(siteSetting).where(eq(siteSetting.key, key));
  }
}