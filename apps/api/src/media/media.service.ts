import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { Readable } from 'node:stream';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type { ImageVariant } from '@kelas/contracts';
import { resolveWithinRoot } from '../common/media/storage-path.js';
import { DatabaseService } from '../db/database.service.js';
import { galleryAlbum } from '../db/schema/gallery.js';
import { galleryImage } from '../db/schema/gallery.js';
import { variantKeyOf } from './image-keys.js';
import { storageKeysOf } from './image-keys.js';
import { MediaStorageService } from './media-storage.service.js';

const PUBLISHED = 'published';

const ARCHIVED = 'archived';

const VISIBLE_STATUSES = [PUBLISHED, ARCHIVED] as const;

const ETAG_UNSAFE = /[^a-zA-Z0-9]/g;

export type ServedImage =
  | {
      kind: 'file';
      stream: Readable;
      mimeType: string;
      byteSize: number;
      etag: string;
    }
  | {
      kind: 'remote';
      location: string;
      etag: string;
    };

type ImageFileRow = { storageKey: string; mimeType: string; byteSize: number };

function etagOf(storageKey: string): string {
  return `"${storageKey.replace(ETAG_UNSAFE, '-')}"`;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly storage: MediaStorageService,
  ) {}

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

  private async findAlbumImage(
    albumId: string,
    imageId: string,
  ): Promise<ImageFileRow | undefined> {
    const rows = await this.database.db
      .select({
        storageKey: galleryImage.storageKey,
        mimeType: galleryImage.mimeType,
        byteSize: galleryImage.byteSize,
      })
      .from(galleryImage)
      .where(and(eq(galleryImage.albumId, albumId), eq(galleryImage.id, imageId)))
      .limit(1);

    return rows[0];
  }

  private async serveRow(
    row: ImageFileRow | undefined,
    variant: ImageVariant,
  ): Promise<ServedImage> {
    if (row === undefined) {
      throw new NotFoundException('Gambar tidak ditemukan.');
    }

    const storageKey = variantKeyOf(row.storageKey, variant);
    const etag = etagOf(storageKey);
    const remote = this.storage.deliveryUrl(storageKeysOf(row.storageKey), variant);

    if (remote !== null) {
      return { kind: 'remote', location: remote, etag };
    }

    const absolute = resolveWithinRoot(this.storage.root, storageKey);

    if (absolute === null) {
      this.logger.error('Kunci penyimpanan ditolak saat menyajikan gambar');

      throw new NotFoundException('Gambar tidak ditemukan.');
    }

    try {
      const info = await stat(absolute);

      if (!info.isFile()) {
        throw new NotFoundException('Gambar tidak ditemukan.');
      }

      return {
        kind: 'file',
        stream: createReadStream(absolute),
        mimeType: row.mimeType,
        byteSize: info.size,
        etag,
      };
    } catch {
      this.logger.warn('Berkas gambar hilang dari penyimpanan');

      throw new NotFoundException('Gambar tidak ditemukan.');
    }
  }

  async serve(id: string, variant: ImageVariant): Promise<ServedImage> {
    return this.serveRow(await this.findVisibleImage(id), variant);
  }

  async serveForAlbum(
    albumId: string,
    imageId: string,
    variant: ImageVariant,
  ): Promise<ServedImage> {
    return this.serveRow(await this.findAlbumImage(albumId, imageId), variant);
  }
}
