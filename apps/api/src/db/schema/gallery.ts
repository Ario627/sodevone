import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { adminUser } from './admin-user.js';
import { createdAtColumn, updatedAtColumn, versionColumn } from './columns.js';

export const galleryAlbum = pgTable(
  'gallery_album',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 120 }).notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    description: text('description'),
    eventDate: date('event_date', { mode: 'string' }).notNull(),
    status: text('status').notNull().default('draft'),
    coverImageId: uuid('cover_image_id').references((): AnyPgColumn => galleryImage.id, {
      onDelete: 'set null',
    }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => adminUser.id, { onDelete: 'restrict' }),
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'string' }),
    version: versionColumn(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('uq_gallery_album_slug').on(table.slug),
    index('idx_gallery_album_public').on(table.eventDate.desc()).where(sql`status = 'published'`),
    index('idx_gallery_album_admin').on(table.status, table.updatedAt.desc()),
    check('ck_gallery_album_version_positive', sql`version > 0`),
    check('ck_gallery_album_slug_format', sql`slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('ck_gallery_album_title_length', sql`char_length(title) >= 3`),
    check('ck_gallery_album_status', sql`status IN ('draft', 'published', 'archived')`),
    check(
      'ck_gallery_album_published_at_required',
      sql`status <> 'published' OR published_at IS NOT NULL`,
    ),
  ],
);

export const galleryImage = pgTable(
  'gallery_image',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    albumId: uuid('album_id')
      .notNull()
      .references(() => galleryAlbum.id, { onDelete: 'cascade' }),
    storageKey: varchar('storage_key', { length: 200 }).notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    thumbWidth: integer('thumb_width').notNull(),
    thumbHeight: integer('thumb_height').notNull(),
    byteSize: integer('byte_size').notNull(),
    mimeType: text('mime_type').notNull(),
    altText: varchar('alt_text', { length: 200 }),
    caption: varchar('caption', { length: 300 }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex('uq_gallery_image_storage_key').on(table.storageKey),
    index('idx_gallery_image_album').on(table.albumId, table.sortOrder, table.id),
    check(
      'ck_gallery_image_dimensions',
      sql`width BETWEEN 1 AND 6000 AND height BETWEEN 1 AND 6000`,
    ),
    check(
      'ck_gallery_image_thumb_dimensions',
      sql`thumb_width BETWEEN 1 AND 6000 AND thumb_height BETWEEN 1 AND 6000`,
    ),
    check('ck_gallery_image_byte_size', sql`byte_size BETWEEN 1 AND 5242880`),
    check('ck_gallery_image_mime_type', sql`mime_type IN ('image/webp', 'image/jpeg')`),
    check('ck_gallery_image_sort_order', sql`sort_order >= 0`),
    check(
      'ck_gallery_image_alt_text_length',
      sql`alt_text IS NULL OR char_length(alt_text) BETWEEN 1 AND 200`,
    ),
  ],
);

export type GalleryAlbumRow = typeof galleryAlbum.$inferSelect;

export type GalleryAlbumInsert = typeof galleryAlbum.$inferInsert;

export type GalleryImageRow = typeof galleryImage.$inferSelect;

export type GalleryImageInsert = typeof galleryImage.$inferInsert;