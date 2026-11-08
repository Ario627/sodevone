import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, isNotNull, or, sql } from 'drizzle-orm';
import { DatabaseService } from '../db/database.service.js';
import type { Executor } from '../db/executor.js';
import { galleryImage } from '../db/schema/gallery.js';
import { socialLink } from '../db/schema/social-link.js';
import type { SocialLinkInsert } from '../db/schema/social-link.js';

export type SocialPublicRow = {
  id: string;
  platform: string;
  url: string;
  caption: string | null;
  postedAt: string | null;
  imageId: string | null;
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  altText: string | null;
  galleryWidth: number | null;
  galleryHeight: number | null;
  galleryAltText: string | null;
};

export type SocialAdminRow = SocialPublicRow & {
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SocialLinkPatch = Partial<SocialLinkInsert>;

const PUBLIC_COLUMNS = {
  id: socialLink.id,
  platform: socialLink.platform,
  url: socialLink.url,
  caption: socialLink.caption,
  postedAt: socialLink.postedAt,
  imageId: socialLink.imageId,
  imageUrl: socialLink.imageUrl,
  imageWidth: socialLink.imageWidth,
  imageHeight: socialLink.imageHeight,
  altText: socialLink.altText,
  galleryWidth: galleryImage.width,
  galleryHeight: galleryImage.height,
  galleryAltText: galleryImage.altText,
};

const ADMIN_COLUMNS = {
  ...PUBLIC_COLUMNS,
  sortOrder: socialLink.sortOrder,
  isVisible: socialLink.isVisible,
  createdAt: socialLink.createdAt,
  updatedAt: socialLink.updatedAt,
};

function hasImageCondition() {
  return or(isNotNull(socialLink.imageId), isNotNull(socialLink.imageUrl));
}

@Injectable()
export class SocialRepository {
  constructor(private readonly database: DatabaseService) {}

  async findVisible(limit: number): Promise<SocialPublicRow[]> {
    return this.database.db
      .select(PUBLIC_COLUMNS)
      .from(socialLink)
      .leftJoin(galleryImage, eq(galleryImage.id, socialLink.imageId))
      .where(and(eq(socialLink.isVisible, true), hasImageCondition()))
      .orderBy(asc(socialLink.sortOrder), asc(socialLink.id))
      .limit(limit);
  }

  async findMany(): Promise<SocialAdminRow[]> {
    return this.database.db
      .select(ADMIN_COLUMNS)
      .from(socialLink)
      .leftJoin(galleryImage, eq(galleryImage.id, socialLink.imageId))
      .orderBy(asc(socialLink.sortOrder), asc(socialLink.id));
  }

  async findById(exec: Executor, id: string): Promise<SocialAdminRow | undefined> {
    const rows = await exec
      .select(ADMIN_COLUMNS)
      .from(socialLink)
      .leftJoin(galleryImage, eq(galleryImage.id, socialLink.imageId))
      .where(eq(socialLink.id, id))
      .limit(1);

    return rows[0];
  }

  async nextSortOrder(exec: Executor): Promise<number> {
    const rows = await exec
      .select({ value: sql<number>`coalesce(max(${socialLink.sortOrder}), -1) + 1` })
      .from(socialLink);

    return rows[0]?.value ?? 0;
  }

  async insert(exec: Executor, values: SocialLinkInsert): Promise<{ id: string }> {
    const rows = await exec.insert(socialLink).values(values).returning({ id: socialLink.id });
    const row = rows[0];

    if (row === undefined) {
      throw new Error('Baris tautan sosial tidak dikembalikan setelah penyimpanan');
    }

    return row;
  }

  async update(exec: Executor, id: string, patch: SocialLinkPatch): Promise<void> {
    await exec.update(socialLink).set(patch).where(eq(socialLink.id, id));
  }

  async remove(exec: Executor, id: string): Promise<{ id: string } | undefined> {
    const rows = await exec
      .delete(socialLink)
      .where(eq(socialLink.id, id))
      .returning({ id: socialLink.id });

    return rows[0];
  }

  async findGalleryImage(
    exec: Executor,
    imageId: string,
  ): Promise<{ id: string; width: number; height: number; altText: string | null } | undefined> {
    const rows = await exec
      .select({
        id: galleryImage.id,
        width: galleryImage.width,
        height: galleryImage.height,
        altText: galleryImage.altText,
      })
      .from(galleryImage)
      .where(eq(galleryImage.id, imageId))
      .limit(1);

    return rows[0];
  }

  async latestUpdatedAt(): Promise<string | undefined> {
    const rows = await this.database.db
      .select({ updatedAt: socialLink.updatedAt })
      .from(socialLink)
      .orderBy(desc(socialLink.updatedAt))
      .limit(1);

    return rows[0]?.updatedAt;
  }
}