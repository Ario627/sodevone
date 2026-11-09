import { Injectable } from '@nestjs/common';
import type {
  AnnouncementCategory,
  AnnouncementDetail,
  AnnouncementListQuery,
  AnnouncementSummary,
  PaginationMeta,
  PublishedState,
} from '@kelas/contracts';
import { toIsoInstant } from '../common/text/instant.js';
import { renderAnnouncementBody } from '../common/text/markdown.js';
import { AnnouncementAttachmentRepository } from './announcement-attachment.repository.js';
import { toAttachments } from './announcement-attachment.mapper.js';
import { AnnouncementRepository } from './announcement.repository.js';
import type { AnnouncementPublicRow } from './announcement.repository.js';
import { DatabaseService } from '../db/database.service.js';

export type AnnouncementPage = { items: AnnouncementSummary[]; meta: PaginationMeta };

export type AnnouncementLookup =
  | { kind: 'found'; detail: AnnouncementDetail }
  | { kind: 'moved'; slug: string; detail: AnnouncementDetail }
  | { kind: 'missing' };

function publicStateOf(status: string): PublishedState {
  return status === 'archived' ? 'archived' : 'published';
}

function publishedAtOf(row: AnnouncementPublicRow): string {
  if (row.publishedAt === null) {
    throw new Error('Baris publik tanpa published_at, periksa constraint basis data');
  }

  return toIsoInstant(row.publishedAt);
}

function toSummary(row: AnnouncementPublicRow): AnnouncementSummary {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category as AnnouncementCategory,
    state: publicStateOf(row.status),
    isPinned: row.isPinned,
    publishedAt: publishedAtOf(row),
  };
}

function toDetail(
  row: AnnouncementPublicRow,
  attachments: AnnouncementDetail['attachments'],
): AnnouncementDetail {
  return {
    ...toSummary(row),
    bodyHtml: renderAnnouncementBody(row.body),
    authorName: null,
    attachments,
    updatedAt: toIsoInstant(row.updatedAt),
  };
}

function metaOf(page: number, perPage: number, total: number): PaginationMeta {
  return { page, perPage, total, totalPages: Math.ceil(total / perPage) };
}

@Injectable()
export class AnnouncementService {
  constructor(
    private readonly repository: AnnouncementRepository,
    private readonly attachments: AnnouncementAttachmentRepository,
    private readonly database: DatabaseService,
  ) {}

  private async detailOf(row: AnnouncementPublicRow): Promise<AnnouncementDetail> {
    return toDetail(row, toAttachments(await this.attachments.findMany(this.database.db, row.id)));
  }

  async list(query: AnnouncementListQuery): Promise<AnnouncementPage> {
    const { rows, total } = await this.repository.findPage({
      page: query.page,
      perPage: query.perPage,
      category: query.kategori,
      search: query.q,
      includeArchived: query.arsip,
    });

    return { items: rows.map(toSummary), meta: metaOf(query.page, query.perPage, total) };
  }

  async detail(slug: string): Promise<AnnouncementLookup> {
    const row = await this.repository.findVisibleBySlug(slug);

    if (row !== undefined) {
      return { kind: 'found', detail: await this.detailOf(row) };
    }

    const redirectId = await this.repository.findRedirectTargetId(slug);

    if (redirectId === undefined) {
      return { kind: 'missing' };
    }

    const moved = await this.repository.findVisibleById(redirectId);

    if (moved === undefined) {
      return { kind: 'missing' };
    }

    return { kind: 'moved', slug: moved.slug, detail: await this.detailOf(moved) };
  }
}
