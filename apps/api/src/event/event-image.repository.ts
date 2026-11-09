import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../db/database.service.js';
import type { Executor } from '../db/executor.js';
import { eventImage } from '../db/schema/event-image.js';
import { galleryAlbum, galleryImage } from '../db/schema/gallery.js';

const PUBLISHED_ALBUM = 'published';

const ARCHIVED_ALBUM = 'archived';

const VISIBLE_ALBUM_STATUSES = [PUBLISHED_ALBUM, ARCHIVED_ALBUM] as const;

export type EventPhotoRow = {
  id: string;
  width: number;
  height: number;
  altText: string | null;
  sortOrder: number;
};

const PHOTO_COLUMNS = {
  id: galleryImage.id,
  width: galleryImage.width,
  height: galleryImage.height,
  altText: galleryImage.altText,
  sortOrder: eventImage.sortOrder,
};

@Injectable()
export class EventImageRepository {
  constructor(private readonly database: DatabaseService) {}

  async findPhotos(eventId: string, publicOnly: boolean): Promise<EventPhotoRow[]> {
    const rows = await this.database.db
      .select(PHOTO_COLUMNS)
      .from(eventImage)
      .innerJoin(galleryImage, eq(galleryImage.id, eventImage.imageId))
      .innerJoin(galleryAlbum, eq(galleryAlbum.id, galleryImage.albumId))
      .where(
        and(
          eq(eventImage.eventId, eventId),
          publicOnly ? inArray(galleryAlbum.status, [...VISIBLE_ALBUM_STATUSES]) : undefined,
        ),
      )
      .orderBy(asc(eventImage.sortOrder), asc(galleryImage.id));

    return rows;
  }

  async countPhotos(eventIds: string[]): Promise<Map<string, number>> {
    if (eventIds.length === 0) {
      return new Map();
    }

    const rows = await this.database.db
      .select({ eventId: eventImage.eventId, value: count() })
      .from(eventImage)
      .where(inArray(eventImage.eventId, eventIds))
      .groupBy(eventImage.eventId);

    return new Map(rows.map((row) => [row.eventId, row.value]));
  }

  async replaceAll(exec: Executor, eventId: string, imageIds: string[]): Promise<void> {
    await exec.delete(eventImage).where(eq(eventImage.eventId, eventId));

    if (imageIds.length === 0) {
      return;
    }

    await exec
      .insert(eventImage)
      .values(imageIds.map((imageId, index) => ({ eventId, imageId, sortOrder: index })));
  }

  async findKnownAlbumImages(imageIds: string[]): Promise<Set<string>> {
    if (imageIds.length === 0) {
      return new Set();
    }

    const rows = await this.database.db
      .select({ id: galleryImage.id })
      .from(galleryImage)
      .innerJoin(galleryAlbum, eq(galleryAlbum.id, galleryImage.albumId))
      .where(
        and(
          inArray(galleryImage.id, imageIds),
          inArray(galleryAlbum.status, [...VISIBLE_ALBUM_STATUSES]),
        ),
      );

    return new Set(rows.map((row) => row.id));
  }
}