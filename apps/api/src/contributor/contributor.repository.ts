import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../db/database.service.js';
import type { Executor } from '../db/executor.js';
import { siteContributor } from '../db/schema/site-contributor.js';
import type { SiteContributorInsert, SiteContributorRow } from '../db/schema/site-contributor.js';

export const PRIMARY_CONTRIBUTOR_ID = '00000000-0000-4000-8000-000000000001';

@Injectable()
export class ContributorRepository {
  constructor(private readonly database: DatabaseService) {}

  async findById(id: string): Promise<SiteContributorRow | undefined> {
    const rows = await this.database.db
      .select()
      .from(siteContributor)
      .where(eq(siteContributor.id, id))
      .limit(1);

    return rows[0];
  }

  async upsert(exec: Executor, values: SiteContributorInsert): Promise<void> {
    await exec
      .insert(siteContributor)
      .values(values)
      .onConflictDoUpdate({
        target: siteContributor.id,
        set: {
          name: values.name,
          nickname: values.nickname,
          role: values.role,
          className: values.className,
          summary: values.summary,
          focuses: values.focuses,
          tools: values.tools,
          isPublished: values.isPublished,
          updatedAt: new Date().toISOString(),
        },
      });
  }
}