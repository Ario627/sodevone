import type { EventAdmin, EventAdminList, EventStatus } from '@kelas/contracts';
import { toIsoInstant } from '../common/text/instant.js';
import type { EventAdminListRow, EventAdminRow } from './event-admin.repository.js';

function baseOf(row: EventAdminListRow): EventAdminList {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    location: row.location,
    startsAt: toIsoInstant(row.startsAt),
    endsAt: row.endsAt === null ? null : toIsoInstant(row.endsAt),
    status: row.status as EventStatus,
    authorName: row.authorName,
    version: row.version,
    createdAt: toIsoInstant(row.createdAt),
    updatedAt: toIsoInstant(row.updatedAt),
  };
}

export function toEventAdminList(row: EventAdminListRow): EventAdminList {
  return baseOf(row);
}

export function toEventAdmin(row: EventAdminRow): EventAdmin {
  return { ...baseOf(row), description: row.description };
}