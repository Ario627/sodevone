import type {
  AlbumAdmin,
  AlbumAdminDetail,
  AlbumAdminListQuery,
  AlbumAdminPage,
  AlbumStatus,
  GalleryImage,
  PaginationMeta,
} from '@kelas/contracts';
import { toIsoInstant, toIsoInstantOrNull } from '../common/text/instant.js';
import type { AlbumAdminRow } from './album-admin.repository.js';
import type { AlbumImageRow } from './album-image.repository.js';

function toImage(row: AlbumImageRow): GalleryImage {
  return {
    id: row.id,
    width: row.width,
    height: row.height,
    altText: row.altText,
    sortOrder: row.sortOrder,
  };
}

export function toAlbumAdmin(row: AlbumAdminRow, imageCount: number): AlbumAdmin {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    eventDate: row.eventDate,
    status: row.status as AlbumStatus,
    coverImageId: row.coverImageId,
    imageCount,
    publishedAt: toIsoInstantOrNull(row.publishedAt),
    createdAt: toIsoInstant(row.createdAt),
    updatedAt: toIsoInstant(row.updatedAt),
  };
}

export function toAlbumAdminDetail(row: AlbumAdminRow, images: AlbumImageRow[]): AlbumAdminDetail {
  return { ...toAlbumAdmin(row, images.length), images: images.map(toImage) };
}

export function toAlbumImages(rows: AlbumImageRow[]): GalleryImage[] {
  return rows.map(toImage);
}

export function toAlbumAdminPage(
  rows: AlbumAdminRow[],
  counts: Map<string, number>,
  query: AlbumAdminListQuery,
  total: number,
): AlbumAdminPage {
  const meta: PaginationMeta = {
    page: query.page,
    perPage: query.perPage,
    total,
    totalPages: Math.ceil(total / query.perPage),
  };

  return {
    items: rows.map((row) => toAlbumAdmin(row, counts.get(row.id) ?? 0)),
    meta,
  };
}