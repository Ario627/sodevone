import { Injectable } from '@nestjs/common';
import type {
  AlbumDetail,
  AlbumDetailQuery,
  AlbumSummary,
  GalleryImage,
  PaginationMeta,
  PublishedState,
} from '@kelas/contracts';
import { toIsoInstant } from '../common/text/instant.js';
import { AlbumRepository } from './album.repository.js';
import type { AlbumImageRow, AlbumPublicRow } from './album.repository.js';

export type AlbumPage = { items: AlbumSummary[]; meta: PaginationMeta };

export type AlbumLookup =
  | { kind: 'found'; detail: AlbumDetail }
  | { kind: 'moved'; slug: string; detail: AlbumDetail }
  | { kind: 'missing' };

function publicStateOf(status: string): PublishedState {
  return status === 'archived' ? 'archived' : 'published';
}

function toImage(row: AlbumImageRow): GalleryImage {
  return {
    id: row.id,
    width: row.width,
    height: row.height,
    altText: row.altText,
    sortOrder: row.sortOrder,
  };
}

function publishedAtOf(row: AlbumPublicRow): string {
  if (row.publishedAt === null) {
    throw new Error('Album publik tanpa published_at, periksa constraint basis data');
  }

  return toIsoInstant(row.publishedAt);
}

function toSummary(
  row: AlbumPublicRow,
  cover: AlbumImageRow | undefined,
  imageCount: number,
): AlbumSummary {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    eventDate: row.eventDate,
    state: publicStateOf(row.status),
    cover: cover === undefined ? null : toImage(cover),
    imageCount,
    publishedAt: publishedAtOf(row),
  };
}

function metaOf(page: number, perPage: number, total: number): PaginationMeta {
  return { page, perPage, total, totalPages: Math.ceil(total / perPage) };
}

@Injectable()
export class AlbumService {
  constructor(private readonly repository: AlbumRepository) {}

  private async coverOf(row: AlbumPublicRow): Promise<AlbumImageRow | undefined> {
    return row.coverImageId === null
      ? undefined
      : this.repository.findCoverImage(row.id, row.coverImageId);
  }

  private async summaryRows(rows: AlbumPublicRow[]): Promise<AlbumSummary[]> {
    const [covers, counts] = await Promise.all([
      Promise.all(rows.map((row) => this.coverOf(row))),
      this.repository.countImages(rows.map((row) => row.id)),
    ]);

    return rows.map((row, index) => toSummary(row, covers[index], counts.get(row.id) ?? 0));
  }

  async list(page: number, perPage: number): Promise<AlbumPage> {
    const { rows, total } = await this.repository.findPage(page, perPage);

    return { items: await this.summaryRows(rows), meta: metaOf(page, perPage, total) };
  }

  async latest(limit: number): Promise<AlbumSummary[]> {
    return this.summaryRows(await this.repository.findLatest(limit));
  }

  private async movedFrom(slug: string): Promise<AlbumPublicRow | undefined> {
    const redirectId = await this.repository.findRedirectTargetId(slug);

    return redirectId === undefined ? undefined : this.repository.findVisibleById(redirectId);
  }

  private async detailOf(row: AlbumPublicRow, query: AlbumDetailQuery): Promise<AlbumDetail> {
    const [cover, total, images] = await Promise.all([
      this.coverOf(row),
      this.repository.countImages([row.id]).then((map) => map.get(row.id) ?? 0),
      this.repository.findImages(row.id, query.page, query.perPage),
    ]);

    return {
      ...toSummary(row, cover, total),
      images: {
        items: images.map(toImage),
        meta: metaOf(query.page, query.perPage, total),
      },
    };
  }

  async detail(slug: string, query: AlbumDetailQuery): Promise<AlbumLookup> {
    const row = await this.repository.findVisibleBySlug(slug);
    const resolved = row ?? (await this.movedFrom(slug));

    if (resolved === undefined) {
      return { kind: 'missing' };
    }

    const detail = await this.detailOf(resolved, query);

    return row !== undefined
      ? { kind: 'found', detail }
      : { kind: 'moved', slug: resolved.slug, detail };
  }
}