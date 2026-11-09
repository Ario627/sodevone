import type { Contributor, ContributorAdmin } from '@kelas/contracts';
import { toIsoInstant } from '../common/text/instant.js';
import type { SiteContributorRow } from '../db/schema/site-contributor.js';

export function toContributor(row: SiteContributorRow): Contributor {
  return {
    id: row.id,
    name: row.name,
    nickname: row.nickname,
    role: row.role,
    className: row.className,
    summary: row.summary,
    focuses: row.focuses.map((focus) => ({ title: focus.title, body: focus.body })),
    tools: [...row.tools],
  };
}

export function toContributorAdmin(row: SiteContributorRow): ContributorAdmin {
  return {
    ...toContributor(row),
    isPublished: row.isPublished,
    updatedAt: toIsoInstant(row.updatedAt),
  };
}