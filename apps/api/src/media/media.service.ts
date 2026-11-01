import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, inArray } from 'drizzle-orm';
import type { ImageVariant } from '@kelas/contracts';
import { resolveWithinRoot } from '../common/media/storage-path.js';
import type { Env } from '../config/env.js';
import { DatabaseService } from '../db/database.service.js';
import { galleryAlbum } from '../db/schema/gallery.js';
import { galleryImage } from '../db/schema/gallery.js';

const PUBLISHED = 'published';

const ARCHIVED = 'archived';

const VISIBLE_STATUSES = [PUBLISHED, ARCHIVED] as const;

const ETAG_UNSAFE = /[^a-zA-Z0-9]/g;

export type ServedImage = {
  stream: Readable;
  mimeType: string;
  byteSize: number;
  etag: string;
};

type ImageFileRow = { storageKey: string; mimeType: string; byteSize: number };

function variantKeyOf(storageKey: string, variant: ImageVariant): string {
  const dot = storageKey.lastIndexOf('.');

  return dot === -1
    ? `${storageKey}-${variant}`
    : `${storageKey.slice(0, dot)}-${variant}${storageKey.slice(dot)}`;
}

function etagOf(storageKey: string): string {
  return `"${storageKey.replace(ETAG_UNSAFE, '-')}"`;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private root(): string {
    return path.resolve(this.config.get('MEDIA_ROOT', { infer: true }));
  }

  private async findVisibleImage(id: string): Promise<ImageFileRow | undefined> {
    const rows = await this.database.db
      .select({
        storageKey: galleryImage.storageKey,
        mimeType: galleryImage.mimeType,
        byteSize: galleryImage.byteSize,
      })
      .from(galleryImage)
      .innerJoin(galleryAlbum, eq(galleryImage.albumId, galleryAlbum.id))
      .where(and(eq(galleryImage.id, id), inArray(galleryAlbum.status, [...VISIBLE_STATUSES])))
      .limit(1);

    return rows[0];
  }

  async serve(id: string, variant: ImageVariant): Promise<ServedImage> {
    const row = await this.findVisibleImage(id);

    if (row === undefined) {
      throw new NotFoundException('Gambar tidak ditemukan.');
    }

    const storageKey = variantKeyOf(row.storageKey, variant);
    const absolute = resolveWithinRoot(this.root(), storageKey);

    if (absolute === null) {
      this.logger.error(`Kunci penyimpanan ditolak untuk gambar ${id}`);

      throw new NotFoundException('Gambar tidak ditemukan.');
    }

    try {
      const info = await stat(absolute);

      if (!info.isFile()) {
        throw new NotFoundException('Gambar tidak ditemukan.');
      }

      return {
        stream: createReadStream(absolute),
        mimeType: row.mimeType,
        byteSize: info.size,
        etag: etagOf(storageKey),
      };
    } catch {
      this.logger.warn(`Berkas gambar ${id} hilang dari penyimpanan`);

      throw new NotFoundException('Gambar tidak ditemukan.');
    }
  }
}
