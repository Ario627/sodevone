import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MAX_IMAGE_UPLOAD_BYTES,
  type AlbumAdminDetail,
  type AlbumAdminListQuery,
  type AlbumAdminPage,
  type AlbumCreate,
  type AlbumStatus,
  type AlbumUpdate,
  type GalleryImage,
  type ImageUploadFailure,
  type ImageUploadResult,
} from '@kelas/contracts';
import { AuditRepository } from '../audit/audit.repository.js';
import type { AuditEntryInput } from '../audit/audit.repository.js';
import type { SessionContext } from '../auth/auth.service.js';
import type { RequestContext } from '../common/http/request-context.js';
import { slugVariant, slugify } from '../common/text/slug.js';
import { Semaphore } from '../common/util/semaphore.js';
import type { Env } from '../config/env.js';
import { DatabaseService } from '../db/database.service.js';
import type { Executor } from '../db/executor.js';
import { isUniqueViolation } from '../db/pg-error.js';
import { storageKeysOf } from '../media/image-keys.js';
import { processImage } from '../media/image-processor.js';
import { removeImageFiles, writeImageFiles } from '../media/image-store.js';
import { AlbumAdminRepository } from './album-admin.repository.js';
import type { AlbumAdminRow, AlbumPatch } from './album-admin.repository.js';
import { AlbumImageRepository } from './album-image.repository.js';
import type { AlbumImageRow } from './album-image.repository.js';
import { assertAlbumTransition } from './album-status.js';
import { toAlbumAdminDetail, toAlbumAdminPage } from './album.mapper.js';

const DRAFT_STATUS: AlbumStatus = 'draft';

const PUBLISHED_STATUS: AlbumStatus = 'published';

const ARCHIVED_STATUS: AlbumStatus = 'archived';

const SLUG_ATTEMPTS = 5;

const NOT_FOUND_MESSAGE = 'Album tidak ditemukan.';

const IMAGE_NOT_FOUND_MESSAGE = 'Foto tidak ditemukan pada album ini.';

const SLUG_CONFLICT_MESSAGE = 'Slug album sudah dipakai. Pilih slug lain.';

const ARCHIVED_UPLOAD_MESSAGE = 'Album yang diarsipkan tidak dapat menerima foto baru.';

const ARCHIVED_EDIT_MESSAGE = 'Album yang diarsipkan tidak dapat diubah.';

const MISSING_ALT_MESSAGE =
  'Semua foto harus memiliki teks alternatif sebelum album diterbitkan.';

const COVER_MISMATCH_MESSAGE = 'Foto sampul harus berasal dari album ini.';

const STORE_FAILED_REASON = 'Gambar gagal disimpan.';

const OVERSIZE_REASON = 'Gambar hasil olahan melebihi batas ukuran.';

const MAX_FILE_NAME_LENGTH = 255;

export type UploadedFile = { originalname: string; buffer: Buffer };

type UploadOutcome =
  | { kind: 'uploaded'; image: GalleryImage }
  | { kind: 'rejected'; reason: string };

function fileNameOf(file: UploadedFile): string {
  return path.basename(file.originalname).slice(0, MAX_FILE_NAME_LENGTH);
}

function slugCandidatesOf(title: string, requested: string | undefined): string[] {
  if (requested !== undefined) {
    return [requested];
  }

  const base = slugify(title);

  return [
    base,
    ...Array.from({ length: SLUG_ATTEMPTS - 1 }, (_, index) => slugVariant(base, index + 2)),
  ];
}

function patchOf(input: AlbumUpdate): AlbumPatch {
  return {
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.eventDate === undefined ? {} : { eventDate: input.eventDate }),
    ...(input.slug === undefined ? {} : { slug: input.slug }),
    ...(input.coverImageId === undefined ? {} : { coverImageId: input.coverImageId }),
  };
}

@Injectable()
export class AlbumAdminService {
  private readonly logger = new Logger(AlbumAdminService.name);

  private readonly limiter: Semaphore;

  constructor(
    private readonly albums: AlbumAdminRepository,
    private readonly images: AlbumImageRepository,
    private readonly audit: AuditRepository,
    private readonly database: DatabaseService,
    private readonly config: ConfigService<Env, true>,
  ) {
    this.limiter = new Semaphore(config.get('IMAGE_UPLOAD_CONCURRENCY', { infer: true }));
  }

  private root(): string {
    return path.resolve(this.config.get('MEDIA_ROOT', { infer: true }));
  }

  private auditOf(
    actor: SessionContext,
    context: RequestContext,
    action: string,
    entityType: 'album' | 'image',
    entityId: string,
  ): AuditEntryInput {
    return {
      actorId: actor.userId,
      actorLabel: actor.username,
      action,
      entityType,
      entityId,
      ipHash: context.ipHash,
      correlationId: context.correlationId,
    };
  }

  private async requireAlbum(exec: Executor, id: string): Promise<AlbumAdminRow> {
    const row = await this.albums.findById(exec, id);

    if (row === undefined) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: NOT_FOUND_MESSAGE });
    }

    return row;
  }

  private async requireImage(
    exec: Executor,
    albumId: string,
    imageId: string,
  ): Promise<AlbumImageRow> {
    const row = await this.images.findOne(exec, albumId, imageId);

    if (row === undefined) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: IMAGE_NOT_FOUND_MESSAGE });
    }

    return row;
  }

  private async ensureCoverBelongsToAlbum(
    exec: Executor,
    albumId: string,
    coverImageId: string | null | undefined,
  ): Promise<void> {
    if (coverImageId === null || coverImageId === undefined) {
      return;
    }

    const image = await this.images.findOne(exec, albumId, coverImageId);

    if (image === undefined) {
      throw new ConflictException({ code: 'CONFLICT', message: COVER_MISMATCH_MESSAGE });
    }
  }

  private async acceptFile(
    album: AlbumAdminRow,
    file: UploadedFile,
    sortOrder: number,
    actor: SessionContext,
    context: RequestContext,
  ): Promise<UploadOutcome> {
    const processed = await processImage(file.buffer);

    if (!processed.ok) {
      return { kind: 'rejected', reason: processed.reason };
    }

    if (processed.image.master.bytes.length > MAX_IMAGE_UPLOAD_BYTES) {
      return { kind: 'rejected', reason: OVERSIZE_REASON };
    }

    const imageId = randomUUID();
    const storageKey = `${album.id}/${imageId}.webp`;
    const keys = storageKeysOf(storageKey);

    try {
      await writeImageFiles(this.root(), keys, processed.image);
    } catch {
      return { kind: 'rejected', reason: STORE_FAILED_REASON };
    }

    try {
      await this.database.db.transaction(async (tx) => {
        await this.images.insert(tx, {
          id: imageId,
          albumId: album.id,
          storageKey,
          width: processed.image.master.width,
          height: processed.image.master.height,
          thumbWidth: processed.image.small.width,
          thumbHeight: processed.image.small.height,
          byteSize: processed.image.master.bytes.length,
          mimeType: 'image/webp',
          sortOrder,
        });

        await this.audit.recordWithin(
          tx,
          this.auditOf(actor, context, 'upload', 'image', imageId),
        );
      });
    } catch (error) {
      await removeImageFiles(this.root(), keys).catch(() => undefined);

      throw error;
    }

    return {
      kind: 'uploaded',
      image: {
        id: imageId,
        width: processed.image.master.width,
        height: processed.image.master.height,
        altText: null,
        sortOrder,
      },
    };
  }

  async list(query: AlbumAdminListQuery): Promise<AlbumAdminPage> {
    const { rows, total } = await this.albums.findPage({
      page: query.page,
      perPage: query.perPage,
      status: query.status,
    });

    const counts = await this.albums.countImagesOf(rows.map((row) => row.id));

    return toAlbumAdminPage(rows, counts, query, total);
  }

  async detail(id: string): Promise<AlbumAdminDetail> {
    const row = await this.requireAlbum(this.database.db, id);
    const images = await this.images.findMany(this.database.db, id);

    return toAlbumAdminDetail(row, images);
  }

  async create(
    input: AlbumCreate,
    actor: SessionContext,
    context: RequestContext,
  ): Promise<AlbumAdminDetail> {
    for (const slug of slugCandidatesOf(input.title, input.slug)) {
      try {
        const createdId = await this.database.db.transaction(async (tx) => {
          const created = await this.albums.insert(tx, {
            slug,
            title: input.title,
            description: input.description ?? null,
            eventDate: input.eventDate,
            status: DRAFT_STATUS,
            createdBy: actor.userId,
          });

          await this.audit.recordWithin(
            tx,
            this.auditOf(actor, context, 'create', 'album', created.id),
          );

          return created.id;
        });

        return this.detail(createdId);
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
      }
    }

    throw new ConflictException({ code: 'CONFLICT', message: SLUG_CONFLICT_MESSAGE });
  }

  async update(
    id: string,
    input: AlbumUpdate,
    actor: SessionContext,
    context: RequestContext,
  ): Promise<AlbumAdminDetail> {
    const current = await this.requireAlbum(this.database.db, id);

    if (current.status === ARCHIVED_STATUS) {
      throw new ConflictException({ code: 'CONFLICT', message: ARCHIVED_EDIT_MESSAGE });
    }

    await this.ensureCoverBelongsToAlbum(this.database.db, id, input.coverImageId);

    const nextSlug = input.slug === undefined ? undefined : input.slug;
    const slugChanged = nextSlug !== undefined && nextSlug !== current.slug;

    try {
      await this.database.db.transaction(async (tx) => {
        await this.albums.update(tx, id, {
          ...patchOf(input),
          updatedAt: new Date().toISOString(),
        });

        if (slugChanged) {
          await this.albums.recordRedirect(tx, current.slug, id);
          await this.albums.dropRedirect(tx, nextSlug);
        }

        await this.audit.recordWithin(tx, this.auditOf(actor, context, 'update', 'album', id));
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({ code: 'CONFLICT', message: SLUG_CONFLICT_MESSAGE });
      }

      throw error;
    }

    return this.detail(id);
  }

  async uploadImages(
    albumId: string,
    files: UploadedFile[],
    actor: SessionContext,
    context: RequestContext,
  ): Promise<ImageUploadResult> {
    const album = await this.requireAlbum(this.database.db, albumId);

    if (album.status === ARCHIVED_STATUS) {
      throw new ConflictException({ code: 'CONFLICT', message: ARCHIVED_UPLOAD_MESSAGE });
    }

    let sortOrder = await this.images.nextSortOrder(this.database.db, albumId);

    const uploaded: GalleryImage[] = [];
    const failed: ImageUploadFailure[] = [];

    for (const file of files) {
      const outcome = await this.limiter.run(() =>
        this.acceptFile(album, file, sortOrder, actor, context),
      );

      if (outcome.kind === 'uploaded') {
        uploaded.push(outcome.image);
        sortOrder += 1;

        continue;
      }

      failed.push({ fileName: fileNameOf(file), reason: outcome.reason });
    }

    return { uploaded, failed };
  }

  async updateImageAlt(
    albumId: string,
    imageId: string,
    altText: string,
    actor: SessionContext,
    context: RequestContext,
  ): Promise<GalleryImage> {
    await this.requireAlbum(this.database.db, albumId);
    const image = await this.requireImage(this.database.db, albumId, imageId);

    await this.database.db.transaction(async (tx) => {
      await this.images.updateAltText(tx, albumId, imageId, altText);
      await this.audit.recordWithin(tx, this.auditOf(actor, context, 'update', 'image', imageId));
    });

    return { ...image, altText };
  }

  async deleteImage(
    albumId: string,
    imageId: string,
    actor: SessionContext,
    context: RequestContext,
  ): Promise<void> {
    const album = await this.requireAlbum(this.database.db, albumId);

    if (album.status !== ARCHIVED_STATUS) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Foto hanya dapat dihapus permanen setelah album diarsipkan.',
      });
    }

    const removed = await this.database.db.transaction(async (tx) => {
      const deleted = await this.images.remove(tx, albumId, imageId);

      if (deleted === undefined) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: IMAGE_NOT_FOUND_MESSAGE });
      }

      await this.audit.recordWithin(tx, this.auditOf(actor, context, 'delete', 'image', imageId));

      return deleted;
    });

    await removeImageFiles(this.root(), storageKeysOf(removed.storageKey)).catch(() => {
      this.logger.warn(`Berkas foto ${imageId} gagal dihapus dan perlu dibersihkan manual`);
    });
  }

  private async changeStatus(
    id: string,
    target: AlbumStatus,
    action: 'publish' | 'archive' | 'restore',
    actor: SessionContext,
    context: RequestContext,
  ): Promise<AlbumAdminDetail> {
    const current = await this.requireAlbum(this.database.db, id);

    assertAlbumTransition(current.status as AlbumStatus, target);

    if (target === PUBLISHED_STATUS) {
      const missing = await this.images.countWithoutAltText(this.database.db, id);

      if (missing > 0) {
        throw new ConflictException({ code: 'CONFLICT', message: MISSING_ALT_MESSAGE });
      }
    }

    const now = new Date().toISOString();
    const patch: AlbumPatch =
      target === PUBLISHED_STATUS
        ? { status: target, publishedAt: now, updatedAt: now }
        : { status: target, updatedAt: now };

    await this.database.db.transaction(async (tx) => {
      await this.albums.update(tx, id, patch);
      await this.audit.recordWithin(tx, this.auditOf(actor, context, action, 'album', id));
    });

    return this.detail(id);
  }

  publish(id: string, actor: SessionContext, context: RequestContext): Promise<AlbumAdminDetail> {
    return this.changeStatus(id, PUBLISHED_STATUS, 'publish', actor, context);
  }

  archive(id: string, actor: SessionContext, context: RequestContext): Promise<AlbumAdminDetail> {
    return this.changeStatus(id, ARCHIVED_STATUS, 'archive', actor, context);
  }

  restore(id: string, actor: SessionContext, context: RequestContext): Promise<AlbumAdminDetail> {
    return this.changeStatus(id, DRAFT_STATUS, 'restore', actor, context);
  }
}