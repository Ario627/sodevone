import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../db/database.service.js';
import type { Executor } from '../db/executor.js';
import { galleryImage } from '../db/schema/gallery.js';
import type { GalleryImageInsert } from '../db/schema/gallery.js';

const FIRST_SORT_ORDER = 0;

export type AlbumImageRow = {
  id: string;
  width: number;
  height: number;
  altText: string | null;
  sortOrder: number;
};

const COLUMNS = {
  id: galleryImage.id,
  width: galleryImage.width,
  height: galleryImage.height,
  altText: galleryImage.altText,
  sortOrder: galleryImage.sortOrder,
};

@Injectable()
export class AlbumImageRepository {
  constructor(private readonly database: DatabaseService) {}

  async findMany(exec: Executor, albumId: string): Promise<AlbumImageRow[]> {
    return exec
      .select(COLUMNS)
      .from(galleryImage)
      .where(eq(galleryImage.albumId, albumId))
      .orderBy(asc(galleryImage.sortOrder), asc(galleryImage.id));
  }

  async findOne(
    exec: Executor,
    albumId: string,
    imageId: string,
  ): Promise<AlbumImageRow | undefined> {
    const rows = await exec
      .select(COLUMNS)
      .from(galleryImage)
      .where(and(eq(galleryImage.albumId, albumId), eq(galleryImage.id, imageId)))
      .limit(1);

    return rows[0];
  }

  async countWithoutAltText(exec: Executor, albumId: string): Promise<number> {
    const rows = await exec
      .select({ value: count() })
      .from(galleryImage)
      .where(and(eq(galleryImage.albumId, albumId), sql`${galleryImage.altText} is null`));

    return rows[0]?.value ?? 0;
  }

  async nextSortOrder(exec: Executor, albumId: string): Promise<number> {
    const rows = await exec
      .select({ value: sql<number>`coalesce(max(${galleryImage.sortOrder}), -1) + 1` })
      .from(galleryImage)
      .where(eq(galleryImage.albumId, albumId));

    return rows[0]?.value ?? FIRST_SORT_ORDER;
  }

  async insert(exec: Executor, values: GalleryImageInsert): Promise<void> {
    await exec.insert(galleryImage).values(values);
  }

  async applyOrder(exec: Executor, albumId: string, ids: string[]): Promise<void> {
    const values = sql.join(
      ids.map((id, index) => sql`(${id}::uuid, ${index}::integer)`),
      sql`, `,
    );

    await exec.execute(sql`
      update ${galleryImage}
      set sort_order = urutan.posisi
      from (values ${values}) as urutan(id, posisi)
      where ${galleryImage.id} = urutan.id and ${galleryImage.albumId} = ${albumId}
    `);
  }

  async updateAltText(
    exec: Executor,
    albumId: string,
    imageId: string,
    altText: string,
  ): Promise<void> {
    await exec
      .update(galleryImage)
      .set({ altText })
      .where(and(eq(galleryImage.albumId, albumId), eq(galleryImage.id, imageId)));
  }

  async remove(
    exec: Executor,
    albumId: string,
    imageId: string,
  ): Promise<{ storageKey: string } | undefined> {
    const rows = await exec
      .delete(galleryImage)
      .where(and(eq(galleryImage.albumId, albumId), eq(galleryImage.id, imageId)))
      .returning({ storageKey: galleryImage.storageKey });

    return rows[0];
  }
}