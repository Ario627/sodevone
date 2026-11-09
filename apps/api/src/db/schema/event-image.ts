import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { event } from './event.js';
import { galleryImage } from './gallery.js';

export const eventImage = pgTable(
  'event_image',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => event.id, { onDelete: 'cascade' }),
    imageId: uuid('image_id')
      .notNull()
      .references(() => galleryImage.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [
    primaryKey({ name: 'pk_event_image', columns: [table.eventId, table.imageId] }),
    index('idx_event_image_order').on(table.eventId, table.sortOrder),
    index('idx_event_image_lookup').on(table.imageId),
    check('ck_event_image_sort_order', sql`sort_order >= 0`),
  ],
);

export type EventImageRow = typeof eventImage.$inferSelect;

export type EventImageInsert = typeof eventImage.$inferInsert;