import { Injectable } from '@nestjs/common';
import type {
  AlbumDetail,
  AlbumDetailQuery,
  AlbumPage,
  AlbumSummary,
  GalleryImage,
  PaginationMeta,
  PublishedState,
} from '@kelas/contracts';
import { toIsoInstant } from '../common/text/instant.js';
import { AlbumRepository } from './album.repository.js';
import type { AlbumImageRow, AlbumPublicRow } from './album.repository.js';

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

  private async coversOf(rows: readonly AlbumPublicRow[]): Promise<Map<string, AlbumImageRow>> {
    const explicit = rows.filter((row) => row.coverImageId !== null);
    const withoutCover = rows.filter((row) => row.coverImageId === null);

    const [chosen, fallback] = await Promise.all([
      Promise.all(
        explicit.map((row) =>
          this.repository.findCoverImage(row.id, row.coverImageId as string),
        ),
      ),
      this.repository.findDefaultCovers(withoutCover.map((row) => row.id)),
    ]);

    const result = new Map<string, AlbumImageRow>(fallback);

    explicit.forEach((row, index) => {
      const image = chosen[index];

      if (image !== undefined) {
        result.set(row.id, image);
      }
    });

    return result;
  }

  private async summaryRows(rows: AlbumPublicRow[]): Promise<AlbumSummary[]> {
    const [covers, counts] = await Promise.all([
      this.coversOf(rows),
      this.repository.countImages(rows.map((row) => row.id)),
    ]);

    return rows.map((row) => toSummary(row, covers.get(row.id), counts.get(row.id) ?? 0));
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
    const [covers, total, images] = await Promise.all([
      this.coversOf([row]),
      this.repository.countImages([row.id]).then((map) => map.get(row.id) ?? 0),
      this.repository.findImages(row.id, query.page, query.perPage),
    ]);

    return {
      ...toSummary(row, covers.get(row.id), total),
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
