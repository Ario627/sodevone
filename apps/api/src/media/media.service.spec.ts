import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Logger, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../config/env.js';
import type { DatabaseService } from '../db/database.service.js';
import { MediaService } from './media.service.js';

const IMAGE_ID = '8f14e45f-ceea-467f-a8d3-1b7c1e1d9b21';

const STORAGE_KEY = 'album-a/foto.webp';

const SEDANG_BYTES = 120;

const KECIL_BYTES = 40;

type Baris = { storageKey: string; mimeType: string; byteSize: number };

let root: string;

function serviceDengan(baris: Baris | undefined): MediaService {
  const chain = {
    select: () => chain,
    from: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(baris === undefined ? [] : [baris]),
  };

  const database = { db: chain } as unknown as DatabaseService;

  const config = {
    get: (key: string) => (key === 'MEDIA_ROOT' ? root : undefined),
  } as unknown as ConfigService<Env, true>;

  return new MediaService(database, config);
}

const BARIS_SAH: Baris = {
  storageKey: STORAGE_KEY,
  mimeType: 'image/webp',
  byteSize: SEDANG_BYTES,
};

beforeEach(() => {
  vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
});

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'kelas-media-'));

  await mkdir(path.join(root, 'album-a'), { recursive: true });
  await writeFile(path.join(root, 'album-a', 'foto-sedang.webp'), Buffer.alloc(SEDANG_BYTES, 1));
  await writeFile(path.join(root, 'album-a', 'foto-kecil.webp'), Buffer.alloc(KECIL_BYTES, 1));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('MediaService', () => {
  it('menyajikan turunan sedang dengan tipe dari basis data', async () => {
    const hasil = await serviceDengan(BARIS_SAH).serve(IMAGE_ID, 'sedang');

    expect(hasil.mimeType).toBe('image/webp');
    expect(hasil.byteSize).toBe(SEDANG_BYTES);

    hasil.stream.destroy();
  });

  it('memakai ukuran berkas sebenarnya pada turunan kecil', async () => {
    const hasil = await serviceDengan(BARIS_SAH).serve(IMAGE_ID, 'kecil');

    expect(hasil.byteSize).toBe(KECIL_BYTES);

    hasil.stream.destroy();
  });

  it('menyusun ETag kuat tanpa karakter yang merusak header', async () => {
    const hasil = await serviceDengan(BARIS_SAH).serve(IMAGE_ID, 'sedang');

    expect(hasil.etag).toMatch(/^"[-a-zA-Z0-9]+"$/);

    hasil.stream.destroy();
  });

  it('menolak gambar yang tidak ada atau albumnya belum terbit', async () => {
    await expect(serviceDengan(undefined).serve(IMAGE_ID, 'sedang')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('menolak berkas yang hilang dari penyimpanan', async () => {
    const hilang: Baris = {
      storageKey: 'album-a/tidak-ada.webp',
      mimeType: 'image/webp',
      byteSize: 1,
    };

    await expect(serviceDengan(hilang).serve(IMAGE_ID, 'sedang')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('menolak kunci penyimpanan yang mencoba keluar dari akar', async () => {
    const jahat: Baris = { storageKey: '../rahasia.webp', mimeType: 'image/webp', byteSize: 1 };

    await expect(serviceDengan(jahat).serve(IMAGE_ID, 'sedang')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('menolak kunci penyimpanan berupa jalur absolut', async () => {
    const jahat: Baris = { storageKey: '/etc/passwd', mimeType: 'image/webp', byteSize: 1 };

    await expect(serviceDengan(jahat).serve(IMAGE_ID, 'sedang')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('menolak direktori sebagai kunci penyimpanan', async () => {
    const direktori: Baris = { storageKey: 'album-a', mimeType: 'image/webp', byteSize: 1 };

    await expect(serviceDengan(direktori).serve(IMAGE_ID, 'sedang')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
