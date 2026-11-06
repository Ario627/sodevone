import { Injectable } from '@nestjs/common';
import { asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { DatabaseService } from '../db/database.service.js';
import type { Executor } from '../db/executor.js';
import { galleryAlbum } from '../db/schema/gallery.js';
import { galleryImage } from '../db/schema/gallery.js';
import type { GalleryAlbumInsert } from '../db/schema/gallery.js';
import { slugRedirect } from '../db/schema/slug-redirect.js';

const ALBUM_RESOURCE = 'album';

export type FindAlbumAdminPageInput = {
  page: number;
  perPage: number;
  status?: string;
};

export type AlbumAdminRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  eventDate: string;
  status: string;
  coverImageId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AlbumAdminPage = { rows: AlbumAdminRow[]; total: number };

export type AlbumPatch = Partial<GalleryAlbumInsert>;

const COLUMNS = {
  id: galleryAlbum.id,
  slug: galleryAlbum.slug,
  title: galleryAlbum.title,
  description: galleryAlbum.description,
  eventDate: galleryAlbum.eventDate,
  status: galleryAlbum.status,
  coverImageId: galleryAlbum.coverImageId,
  publishedAt: galleryAlbum.publishedAt,
  createdAt: galleryAlbum.createdAt,
  updatedAt: galleryAlbum.updatedAt,
};

@Injectable()
export class AlbumAdminRepository {
  constructor(private readonly database: DatabaseService) {}

  async findPage(input: FindAlbumAdminPageInput): Promise<AlbumAdminPage> {
    const where = input.status === undefined ? undefined : eq(galleryAlbum.status, input.status);
    const offset = (input.page - 1) * input.perPage;

    const [rows, totals] = await Promise.all([
      this.database.db
        .select(COLUMNS)
        .from(galleryAlbum)
        .where(where)
        .orderBy(desc(galleryAlbum.eventDate), asc(galleryAlbum.id))
        .limit(input.perPage)
        .offset(offset),
      this.database.db.select({ value: count() }).from(galleryAlbum).where(where),
    ]);

    return { rows, total: totals[0]?.value ?? 0 };
  }

  async findById(exec: Executor, id: string): Promise<AlbumAdminRow | undefined> {
    const rows = await exec
      .select(COLUMNS)
      .from(galleryAlbum)
      .where(eq(galleryAlbum.id, id))
      .limit(1);

    return rows[0];
  }

  async countImagesOf(albumIds: string[]): Promise<Map<string, number>> {
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

  async insert(exec: Executor, values: GalleryAlbumInsert): Promise<{ id: string }> {
    const rows = await exec
      .insert(galleryAlbum)
      .values(values)
      .returning({ id: galleryAlbum.id });
    const row = rows[0];

    if (row === undefined) {
      throw new Error('Baris album tidak dikembalikan setelah penyimpanan');
    }

    return row;
  }

  async update(exec: Executor, id: string, patch: AlbumPatch): Promise<void> {
    await exec
      .update(galleryAlbum)
      .set({ ...patch, version: sql`${galleryAlbum.version} + 1` })
      .where(eq(galleryAlbum.id, id));
  }

  async recordRedirect(exec: Executor, oldSlug: string, albumId: string): Promise<void> {
    await exec
      .insert(slugRedirect)
      .values({ oldSlug, resourceType: ALBUM_RESOURCE, resourceId: albumId })
      .onConflictDoUpdate({
        target: slugRedirect.oldSlug,
        set: { resourceType: ALBUM_RESOURCE, resourceId: albumId, createdAt: sql`now()` },
      });
  }

  async dropRedirect(exec: Executor, slug: string): Promise<void> {
    await exec.delete(slugRedirect).where(eq(slugRedirect.oldSlug, slug));
  }
}