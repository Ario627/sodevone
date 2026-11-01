import type { AnnouncementAdminDetail, AnnouncementAdminList, AnnouncementCategory } from '@kelas/contracts';
import { toIsoInstant, toIsoInstantOrNull } from '../common/text/instant.js';
import { renderAnnouncementBody } from '../common/text/markdown.js';
import type {
  AnnouncementAdminDetailRow,
  AnnouncementAdminListRow,
} from './announcement-admin.repository.js';

function baseOf(row: AnnouncementAdminListRow): AnnouncementAdminList {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category as AnnouncementCategory,
    status: row.status as AnnouncementAdminList['status'],
    authorId: row.authorId,
    authorName: row.authorName,
    version: row.version,
    publishedAt: toIsoInstantOrNull(row.publishedAt),
    createdAt: toIsoInstant(row.createdAt),
    updatedAt: toIsoInstant(row.updatedAt),
  };
}

export function toAdminList(row: AnnouncementAdminListRow): AnnouncementAdminList {
  return baseOf(row);
}

export function toAdminDetail(row: AnnouncementAdminDetailRow): AnnouncementAdminDetail {
  return {
    ...baseOf(row),
    body: row.body,
    bodyHtml: renderAnnouncementBody(row.body),
  };
}