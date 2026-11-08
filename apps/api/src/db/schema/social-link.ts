import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { adminUser } from './admin-user.js';
import { createdAtColumn, updatedAtColumn } from './columns.js';
import { galleryImage } from './gallery.js';

export const socialLink = pgTable(
  'social_link',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    platform: text('platform').notNull(),
    url: text('url').notNull(),
    caption: varchar('caption', { length: 280 }),
    postedAt: timestamp('posted_at', { withTimezone: true, mode: 'string' }),
    imageId: uuid('image_id').references(() => galleryImage.id, { onDelete: 'set null' }),
    imageUrl: text('image_url'),
    imageWidth: integer('image_width'),
    imageHeight: integer('image_height'),
    altText: varchar('alt_text', { length: 200 }),
    sortOrder: integer('sort_order').notNull().default(0),
    isVisible: boolean('is_visible').notNull().default(true),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => adminUser.id, { onDelete: 'restrict' }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index('idx_social_link_public').on(table.isVisible, table.sortOrder, table.id),
    index('idx_social_link_platform').on(table.platform),
    check('ck_social_link_platform', sql`platform IN ('instagram', 'tiktok')`),
    check('ck_social_link_url_https', sql`url ~ '^https://'`),
    check('ck_social_link_image_url_https', sql`image_url IS NULL OR image_url ~ '^https://'`),
    check(
      'ck_social_link_single_image',
      sql`image_id IS NULL OR image_url IS NULL`,
    ),
    check(
      'ck_social_link_image_dimensions',
      sql`image_url IS NULL OR (image_width IS NOT NULL AND image_height IS NOT NULL AND image_width BETWEEN 1 AND 6000 AND image_height BETWEEN 1 AND 6000)`,
    ),
    check('ck_social_link_sort_order', sql`sort_order >= 0`),
    check(
      'ck_social_link_caption_length',
      sql`caption IS NULL OR char_length(caption) BETWEEN 1 AND 280`,
    ),
    check(
      'ck_social_link_alt_text_length',
      sql`alt_text IS NULL OR char_length(alt_text) BETWEEN 1 AND 200`,
    ),
  ],
);

export type SocialLinkRow = typeof socialLink.$inferSelect;

export type SocialLinkInsert = typeof socialLink.$inferInsert;