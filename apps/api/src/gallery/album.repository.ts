import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../db/database.service.js';
import { galleryAlbum } from '../db/schema/gallery.js';
import { galleryImage } from '../db/schema/gallery.js';
import { slugRedirect } from '../db/schema/slug-redirect.js';

const PUBLISHED = 'published';

const ARCHIVED = 'archived';

const ALBUM_RESOURCE = 'album';

const VISIBLE_STATUSES = [PUBLISHED, ARCHIVED] as const;

export type AlbumPublicRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  eventDate: string;
  status: string;
  coverImageId: string | null;
  publishedAt: string | null;
};

export type AlbumImageRow = {
  id: string;
  width: number;
  height: number;
  altText: string | null;
  sortOrder: number;
};

export type AlbumPage = { rows: AlbumPublicRow[]; total: number };

const ALBUM_COLUMNS = {
  id: galleryAlbum.id,
  slug: galleryAlbum.slug,
  title: galleryAlbum.title,
  description: galleryAlbum.description,
  eventDate: galleryAlbum.eventDate,
  status: galleryAlbum.status,
  coverImageId: galleryAlbum.coverImageId,
  publishedAt: galleryAlbum.publishedAt,
};

const IMAGE_COLUMNS = {
  id: galleryImage.id,
  width: galleryImage.width,
  height: galleryImage.height,
  altText: galleryImage.altText,
  sortOrder: galleryImage.sortOrder,
};

function publishedCondition() {
  return eq(galleryAlbum.status, PUBLISHED);
}

@Injectable()
export class AlbumRepository {
  constructor(private readonly database: DatabaseService) {}

  async findPage(page: number, perPage: number): Promise<AlbumPage> {
    const offset = (page - 1) * perPage;

    const [rows, totals] = await Promise.all([
      this.database.db
        .select(ALBUM_COLUMNS)
        .from(galleryAlbum)
        .where(publishedCondition())
        .orderBy(desc(galleryAlbum.eventDate), asc(galleryAlbum.id))
        .limit(perPage)
        .offset(offset),
      this.database.db.select({ value: count() }).from(galleryAlbum).where(publishedCondition()),
    ]);

    return { rows, total: totals[0]?.value ?? 0 };
  }

  async findLatest(limit: number): Promise<AlbumPublicRow[]> {
    return this.database.db
      .select(ALBUM_COLUMNS)
      .from(galleryAlbum)
      .where(publishedCondition())
      .orderBy(desc(galleryAlbum.eventDate), asc(galleryAlbum.id))
      .limit(limit);
  }

  async findVisibleBySlug(slug: string): Promise<AlbumPublicRow | undefined> {
    const rows = await this.database.db
      .select(ALBUM_COLUMNS)
      .from(galleryAlbum)
      .where(
        and(eq(galleryAlbum.slug, slug), inArray(galleryAlbum.status, [...VISIBLE_STATUSES])),
      )
      .limit(1);

    return rows[0];
  }

  async findVisibleById(id: string): Promise<AlbumPublicRow | undefined> {
    const rows = await this.database.db
      .select(ALBUM_COLUMNS)
      .from(galleryAlbum)
      .where(and(eq(galleryAlbum.id, id), inArray(galleryAlbum.status, [...VISIBLE_STATUSES])))
      .limit(1);

    return rows[0];
  }

  async countImages(albumIds: string[]): Promise<Map<string, number>> {
    if (albumIds.length === 0) {
      return new Map();
    }

    const rows = await this.database.db
      .select({ albumId: galleryImage.albumId, value: count() })
      .from(galleryImage)
      .where(inArray(galleryImage.albumId, albumIds))
      .groupBy(galleryImage.albumId);

    return new Map(rows.map((row) => [row.albumId, row.value]));
  }

  async findImages(albumId: string, page: number, perPage: number): Promise<AlbumImageRow[]> {
    return this.database.db
      .select(IMAGE_COLUMNS)
      .from(galleryImage)
      .where(eq(galleryImage.albumId, albumId))
      .orderBy(asc(galleryImage.sortOrder), asc(galleryImage.id))
      .limit(perPage)
      .offset((page - 1) * perPage);
  }

  async findCoverImage(albumId: string, coverImageId: string): Promise<AlbumImageRow | undefined> {
    const rows = await this.database.db
      .select(IMAGE_COLUMNS)
      .from(galleryImage)
      .where(and(eq(galleryImage.albumId, albumId), eq(galleryImage.id, coverImageId)))
      .limit(1);

    return rows[0];
  }

  async findRedirectTargetId(slug: string): Promise<string | undefined> {
    const rows = await this.database.db
      .select({ resourceId: slugRedirect.resourceId })
      .from(slugRedirect)
      .where(and(eq(slugRedirect.oldSlug, slug), eq(slugRedirect.resourceType, ALBUM_RESOURCE)))
      .limit(1);

    return rows[0]?.resourceId;
  }
}