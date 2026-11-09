import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import {
  ANNOUNCEMENT_ATTACHMENT_MAX,
  ATTACHMENT_FILE_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  type AnnouncementAttachment,
  type ImageVariant,
} from '@kelas/contracts';
import { AuditRepository } from '../audit/audit.repository.js';
import type { AuditEntryInput } from '../audit/audit.repository.js';
import type { SessionContext } from '../auth/auth.service.js';
import { resolveWithinRoot } from '../common/media/storage-path.js';
import type { RequestContext } from '../common/http/request-context.js';
import { Semaphore } from '../common/util/semaphore.js';
import type { Env } from '../config/env.js';
import { DatabaseService } from '../db/database.service.js';
import type { Executor } from '../db/executor.js';
import { announcement } from '../db/schema/announcement.js';
import { announcementAttachment } from '../db/schema/announcement-attachment.js';
import { announcementAttachmentBlob } from '../db/schema/announcement-attachment.js';
import type { AnnouncementAttachmentRow } from '../db/schema/announcement-attachment.js';
import { storageKeysOf, variantKeyOf } from '../media/image-keys.js';
import { processImage } from '../media/image-processor.js';
import { MediaStorageService } from '../media/media-storage.service.js';
import { AnnouncementAttachmentRepository } from './announcement-attachment.repository.js';
import { toAttachments } from './announcement-attachment.mapper.js';

const ARCHIVED_STATUS = 'archived';

const PUBLISHED_STATUS = 'published';

const IMAGE_MIME = 'image/webp';

const PDF_SIGNATURE = '%PDF-';

const PDF_EXTENSION = '.pdf';

const IMAGE_EXTENSION = '.webp';

const MAX_TOTAL_BYTES = 12 * 1024 * 1024;

const NOT_FOUND_MESSAGE = 'Pengumuman tidak ditemukan.';

const ATTACHMENT_NOT_FOUND_MESSAGE = 'Lampiran tidak ditemukan.';

const ARCHIVED_MESSAGE = 'Pengumuman yang diarsipkan tidak dapat diubah lampirannya.';

const FULL_MESSAGE = `Maksimal ${ANNOUNCEMENT_ATTACHMENT_MAX} lampiran per pengumuman.`;

const TOTAL_MESSAGE = 'Total ukuran lampiran melebihi 12 MB. Hapus lampiran lain dulu.';

const UNSUPPORTED_MESSAGE = 'Hanya gambar JPEG/PNG/WebP atau berkas PDF yang dapat dilampirkan.';

const OVERSIZE_MESSAGE = `Ukuran berkas melebihi ${MAX_ATTACHMENT_BYTES / 1_048_576} MB.`;

const ORDER_MISMATCH_MESSAGE = 'Daftar urutan harus memuat seluruh lampiran pengumuman ini.';

export type UploadedAttachmentFile = { originalname: string; buffer: Buffer };

export type ServedAttachment =
  | { kind: 'stream'; stream: Readable; mimeType: string; byteSize: number; fileName: string }
  | { kind: 'redirect'; location: string };

function isPdf(source: Buffer): boolean {
  return source.subarray(0, PDF_SIGNATURE.length).toString('latin1') === PDF_SIGNATURE;
}

function fileNameOf(file: UploadedAttachmentFile): string {
  const base = file.originalname.split(/[\\/]/).pop()?.trim() ?? '';

  return base.length === 0 ? 'lampiran' : base.slice(0, 160);
}

function badRequest(message: string, path: string): BadRequestException {
  return new BadRequestException({
    code: 'VALIDATION_FAILED',
    message,
    fields: [{ path, message }],
  });
}

@Injectable()
export class AnnouncementAttachmentService {
  private readonly logger = new Logger(AnnouncementAttachmentService.name);

  private readonly limiter: Semaphore;

  constructor(
    private readonly repository: AnnouncementAttachmentRepository,
    private readonly audit: AuditRepository,
    private readonly database: DatabaseService,
    private readonly storage: MediaStorageService,
    config: ConfigService<Env, true>,
  ) {
    this.limiter = new Semaphore(config.get('IMAGE_UPLOAD_CONCURRENCY', { infer: true }));
  }

  private auditOf(
    actor: SessionContext,
    context: RequestContext,
    action: string,
    attachmentId: string,
  ): AuditEntryInput {
    return {
      actorId: actor.userId,
      actorLabel: actor.username,
      action,
      entityType: 'attachment',
      entityId: attachmentId,
      ipHash: context.ipHash,
      correlationId: context.correlationId,
    };
  }

  private async requireEditable(exec: Executor, announcementId: string): Promise<void> {
    const status = await this.repository.announcementStatusOf(exec, announcementId);

    if (status === undefined) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: NOT_FOUND_MESSAGE });
    }

    if (status === ARCHIVED_STATUS) {
      throw new ConflictException({ code: 'CONFLICT', message: ARCHIVED_MESSAGE });
    }
  }

  async list(exec: Executor, announcementId: string): Promise<AnnouncementAttachment[]> {
    return toAttachments(await this.repository.findMany(exec, announcementId));
  }

  async upload(
    announcementId: string,
    files: UploadedAttachmentFile[],
    actor: SessionContext,
    context: RequestContext,
  ): Promise<AnnouncementAttachment[]> {
    if (files.length === 0) {
      throw badRequest('Tidak ada berkas yang dikirim.', 'berkas');
    }

    await this.requireEditable(this.database.db, announcementId);

    const existing = await this.repository.countOf(this.database.db, announcementId);

    if (existing + files.length > ANNOUNCEMENT_ATTACHMENT_MAX) {
      throw new ConflictException({ code: 'CONFLICT', message: FULL_MESSAGE });
    }

    let used = await this.repository.totalBytesOf(this.database.db, announcementId);

    for (const file of files) {
      used += file.buffer.length;

      if (used > MAX_TOTAL_BYTES) {
        throw new ConflictException({ code: 'CONFLICT', message: TOTAL_MESSAGE });
      }
    }

    await this.limiter.run(async () => {
      for (const file of files) {
        await this.acceptFile(announcementId, file, actor, context);
      }
    });

    return this.list(this.database.db, announcementId);
  }

  private async acceptFile(
    announcementId: string,
    file: UploadedAttachmentFile,
    actor: SessionContext,
    context: RequestContext,
  ): Promise<void> {
    const attachmentId = randomUUID();
    const fileName = fileNameOf(file);

    if (isPdf(file.buffer)) {
      await this.storePdf(announcementId, attachmentId, fileName, file.buffer, actor, context);

      return;
    }

    const processed = await processImage(file.buffer);

    if (!processed.ok) {
      throw badRequest(UNSUPPORTED_MESSAGE, 'berkas');
    }

    if (processed.image.master.bytes.length > MAX_ATTACHMENT_BYTES) {
      throw badRequest(OVERSIZE_MESSAGE, 'berkas');
    }

    const storageKey = `${announcementId}/${attachmentId}${IMAGE_EXTENSION}`;
    const keys = storageKeysOf(storageKey);

    try {
      await this.storage.write(keys, processed.image);
    } catch {
      throw new ConflictException({ code: 'CONFLICT', message: 'Gambar gagal disimpan.' });
    }

    try {
      await this.database.db.transaction(async (tx) => {
        await this.repository.insert(tx, {
          id: attachmentId,
          announcementId,
          kind: 'image',
          storageKey,
          fileName,
          mimeType: IMAGE_MIME,
          byteSize: processed.image.master.bytes.length,
          width: processed.image.master.width,
          height: processed.image.master.height,
          sortOrder: await this.repository.nextSortOrder(tx, announcementId),
          createdBy: actor.userId,
        });

        await this.audit.recordWithin(tx, this.auditOf(actor, context, 'upload', attachmentId));
      });
    } catch (error) {
      await this.storage.remove(keys).catch(() => undefined);

      throw error;
    }
  }

  private async storePdf(
    announcementId: string,
    attachmentId: string,
    fileName: string,
    bytes: Buffer,
    actor: SessionContext,
    context: RequestContext,
  ): Promise<void> {
    if (bytes.length > MAX_ATTACHMENT_BYTES) {
      throw badRequest(OVERSIZE_MESSAGE, 'berkas');
    }

    await this.database.db.transaction(async (tx) => {
      await this.repository.insert(tx, {
        id: attachmentId,
        announcementId,
        kind: 'file',
        storageKey: `${announcementId}/${attachmentId}${PDF_EXTENSION}`,
        fileName,
        mimeType: ATTACHMENT_FILE_MIME_TYPES[0],
        byteSize: bytes.length,
        width: null,
        height: null,
        sortOrder: await this.repository.nextSortOrder(tx, announcementId),
        createdBy: actor.userId,
      });

      await tx.insert(announcementAttachmentBlob).values({ attachmentId, bytes });

      await this.audit.recordWithin(tx, this.auditOf(actor, context, 'upload', attachmentId));
    });
  }

  async remove(
    announcementId: string,
    attachmentId: string,
    actor: SessionContext,
    context: RequestContext,
  ): Promise<void> {
    await this.requireEditable(this.database.db, announcementId);

    const removed = await this.database.db.transaction(async (tx) => {
      const row = await this.repository.remove(tx, announcementId, attachmentId);

      if (row === undefined) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: ATTACHMENT_NOT_FOUND_MESSAGE,
        });
      }

      await this.audit.recordWithin(tx, this.auditOf(actor, context, 'delete', attachmentId));

      return row;
    });

    if (removed.kind === 'image') {
      await this.storage.remove(storageKeysOf(removed.storageKey)).catch(() => {
        this.logger.warn(`Berkas lampiran ${attachmentId} gagal dihapus dan perlu dibersihkan`);
      });
    }
  }

  async reorder(
    announcementId: string,
    ids: string[],
    actor: SessionContext,
    context: RequestContext,
  ): Promise<AnnouncementAttachment[]> {
    await this.requireEditable(this.database.db, announcementId);

    const known = await this.repository.findMany(this.database.db, announcementId);
    const knownIds = new Set(known.map((row) => row.id));

    if (known.length !== ids.length || !ids.every((id) => knownIds.has(id))) {
      throw badRequest(ORDER_MISMATCH_MESSAGE, 'ids');
    }

    await this.database.db.transaction(async (tx) => {
      await this.repository.applyOrder(tx, announcementId, ids);

      await this.audit.recordWithin(tx, this.auditOf(actor, context, 'update', announcementId));
    });

    return this.list(this.database.db, announcementId);
  }

  async requireForAnnouncement(
    announcementId: string,
    attachmentId: string,
    publicOnly: boolean,
  ): Promise<AnnouncementAttachmentRow> {
    const row = await this.repository.findOne(this.database.db, announcementId, attachmentId);

    if (row === undefined) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: ATTACHMENT_NOT_FOUND_MESSAGE });
    }

    if (!publicOnly) {
      return row;
    }

    const visible = await this.database.db
      .select({ id: announcement.id })
      .from(announcement)
      .where(and(eq(announcement.id, announcementId), eq(announcement.status, PUBLISHED_STATUS)))
      .limit(1);

    if (visible.length === 0) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: NOT_FOUND_MESSAGE });
    }

    return row;
  }

  async requireByAttachmentId(attachmentId: string): Promise<AnnouncementAttachmentRow> {
    const rows = await this.database.db
      .select()
      .from(announcementAttachment)
      .where(eq(announcementAttachment.id, attachmentId))
      .limit(1);

    const row = rows[0];

    if (row === undefined) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: ATTACHMENT_NOT_FOUND_MESSAGE });
    }

    return row;
  }

  async serve(
    announcementId: string,
    attachmentId: string,
    variant: ImageVariant,
    publicOnly: boolean,
  ): Promise<ServedAttachment> {
    const row = await this.requireForAnnouncement(announcementId, attachmentId, publicOnly);

    return this.serveRow(row, variant);
  }

  async serveForSlug(
    slug: string,
    attachmentId: string,
    variant: ImageVariant,
  ): Promise<ServedAttachment> {
    const owner = await this.repository.announcementBySlug(this.database.db, slug);

    if (owner === undefined || owner.status !== PUBLISHED_STATUS) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: NOT_FOUND_MESSAGE });
    }

    const row = await this.repository.findOne(this.database.db, owner.id, attachmentId);

    if (row === undefined) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: ATTACHMENT_NOT_FOUND_MESSAGE });
    }

    return this.serveRow(row, variant);
  }

  private async serveRow(
    row: AnnouncementAttachmentRow,
    variant: ImageVariant,
  ): Promise<ServedAttachment> {
    if (row.kind === 'file') {
      return this.servePdf(row);
    }

    const remote = this.storage.deliveryUrl(storageKeysOf(row.storageKey), variant);

    if (remote !== null) {
      return { kind: 'redirect', location: remote };
    }

    const absolute = resolveWithinRoot(this.storage.root, variantKeyOf(row.storageKey, variant));

    if (absolute === null) {
      this.logger.error('Kunci penyimpanan lampiran ditolak');

      throw new NotFoundException({ code: 'NOT_FOUND', message: ATTACHMENT_NOT_FOUND_MESSAGE });
    }

    try {
      const info = await stat(absolute);

      if (!info.isFile()) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: ATTACHMENT_NOT_FOUND_MESSAGE,
        });
      }

      return {
        kind: 'stream',
        stream: createReadStream(absolute),
        mimeType: row.mimeType,
        byteSize: info.size,
        fileName: row.fileName,
      };
    } catch {
      this.logger.warn('Berkas lampiran hilang dari penyimpanan');

      throw new NotFoundException({ code: 'NOT_FOUND', message: ATTACHMENT_NOT_FOUND_MESSAGE });
    }
  }

  private async servePdf(row: AnnouncementAttachmentRow): Promise<ServedAttachment> {
    const rows = await this.database.db
      .select({ bytes: announcementAttachmentBlob.bytes })
      .from(announcementAttachmentBlob)
      .where(eq(announcementAttachmentBlob.attachmentId, row.id))
      .limit(1);

    const bytes = rows[0]?.bytes;

    if (bytes === undefined) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: ATTACHMENT_NOT_FOUND_MESSAGE });
    }

    return {
      kind: 'stream',
      stream: Readable.from(bytes),
      mimeType: row.mimeType,
      byteSize: bytes.length,
      fileName: row.fileName,
    };
  }
}