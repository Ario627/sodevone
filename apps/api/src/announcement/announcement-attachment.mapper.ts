import type { AnnouncementAttachment } from '@kelas/contracts';
import type { AnnouncementAttachmentRow } from '../db/schema/announcement-attachment.js';

export function toAttachment(row: AnnouncementAttachmentRow): AnnouncementAttachment {
  return {
    id: row.id,
    kind: row.kind as AnnouncementAttachment['kind'],
    fileName: row.fileName,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    width: row.width,
    height: row.height,
    sortOrder: row.sortOrder,
  };
}

export function toAttachments(rows: AnnouncementAttachmentRow[]): AnnouncementAttachment[] {
  return rows.map(toAttachment);
}