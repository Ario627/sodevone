import { sql } from 'drizzle-orm';
import {
  check,
  customType,
  index,
  integer,
  pgTable,
  text,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createdAtColumn } from './columns.js';
import { adminUser } from './admin-user.js';
import { announcement } from './announcement.js';

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const bytea = customType<{ data: Buffer; notNull: true; default: false }>({
  dataType: () => 'bytea',
});

export const announcementAttachment = pgTable(
  'announcement_attachment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    announcementId: uuid('announcement_id')
      .notNull()
      .references(() => announcement.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    storageKey: text('storage_key').notNull(),
    fileName: varchar('file_name', { length: 160 }).notNull(),
    mimeType: varchar('mime_type', { length: 120 }).notNull(),
    byteSize: integer('byte_size').notNull(),
    width: integer('width'),
    height: integer('height'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => adminUser.id, { onDelete: 'restrict' }),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index('idx_announcement_attachment_list').on(table.announcementId, table.sortOrder),
    check('ck_announcement_attachment_kind', sql`kind IN ('image', 'file')`),
    check(
      'ck_announcement_attachment_size',
      sql`byte_size > 0 AND byte_size <= ${sql.raw(String(MAX_ATTACHMENT_BYTES))}`,
    ),
    check('ck_announcement_attachment_sort_order', sql`sort_order >= 0`),
    check('ck_announcement_attachment_file_name', sql`char_length(btrim(file_name)) >= 1`),
    check(
      'ck_announcement_attachment_shape',
      sql`(kind = 'image' AND width IS NOT NULL AND height IS NOT NULL AND mime_type = 'image/webp')
        OR (kind = 'file' AND width IS NULL AND height IS NULL AND mime_type = 'application/pdf')`,
    ),
  ],
);

export type AnnouncementAttachmentRow = typeof announcementAttachment.$inferSelect;

export type AnnouncementAttachmentInsert = typeof announcementAttachment.$inferInsert;

export const announcementAttachmentBlob = pgTable('announcement_attachment_blob', {
  attachmentId: uuid('attachment_id')
    .primaryKey()
    .references(() => announcementAttachment.id, { onDelete: 'cascade' }),
  bytes: bytea('bytes').notNull(),
});

export type AnnouncementAttachmentBlobRow = typeof announcementAttachmentBlob.$inferSelect;