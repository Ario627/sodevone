import type {
  EventAdmin,
  EventAdminDetail,
  EventAdminList,
  EventPhoto,
  EventStatus,
} from '@kelas/contracts';
import { toIsoInstant } from '../common/text/instant.js';
import type { EventAdminListRow, EventAdminRow } from './event-admin.repository.js';
import type { EventPhotoRow } from './event-image.repository.js';

function baseOf(row: EventAdminListRow, photoCount: number): EventAdminList {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    location: row.location,
    startsAt: toIsoInstant(row.startsAt),
    endsAt: row.endsAt === null ? null : toIsoInstant(row.endsAt),
    status: row.status as EventStatus,
    photoCount,
    authorName: row.authorName,
    version: row.version,
    createdAt: toIsoInstant(row.createdAt),
    updatedAt: toIsoInstant(row.updatedAt),
  };
}

export function toEventPhoto(row: EventPhotoRow): EventPhoto {
  return {
    id: row.id,
    width: row.width,
    height: row.height,
    altText: row.altText === null || row.altText.length === 0 ? null : row.altText,
    sortOrder: row.sortOrder,
  };
}

export function toEventPhotos(rows: EventPhotoRow[]): EventPhoto[] {
  return rows.map(toEventPhoto);
}

export function toEventAdminList(row: EventAdminListRow, photoCount: number): EventAdminList {
  return baseOf(row, photoCount);
}

export function toEventAdmin(row: EventAdminRow, photoCount: number): EventAdmin {
  return { ...baseOf(row, photoCount), description: row.description };
}

export function toEventAdminDetail(
  row: EventAdminRow,
  photoCount: number,
  photos: EventPhoto[],
): EventAdminDetail {
  return { ...toEventAdmin(row, photoCount), photos };
}
