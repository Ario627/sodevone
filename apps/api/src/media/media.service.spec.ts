import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Logger, NotFoundException } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../db/database.service.js';
import type { MediaStorageService } from './media-storage.service.js';
import { MediaService } from './media.service.js';

const IMAGE_ID = '8f14e45f-ceea-467f-a8d3-1b7c1e1d9b21';

const STORAGE_KEY = 'album-a/foto.webp';

const SEDANG_BYTES = 120;

const KECIL_BYTES = 40;

type Baris = { storageKey: string; mimeType: string; byteSize: number };

let root: string;

function storageLokal(): MediaStorageService {
  return {
    driver: 'local',
    remote: false,
    root,
    deliveryUrl: () => null,
  } as unknown as MediaStorageService;
}

function serviceDengan(baris: Baris | undefined, storage = storageLokal()): MediaService {
  const chain = {
    select: () => chain,
    from: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(baris === undefined ? [] : [baris]),
  };

  const database = { db: chain } as unknown as DatabaseService;

  return new MediaService(database, storage);
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

    expect(hasil.kind).toBe('file');

    if (hasil.kind !== 'file') {
      throw new Error('seharusnya berkas lokal');
    }

    expect(hasil.mimeType).toBe('image/webp');
    expect(hasil.byteSize).toBe(SEDANG_BYTES);

    hasil.stream.destroy();
  });

  it('memakai ukuran berkas sebenarnya pada turunan kecil', async () => {
    const hasil = await serviceDengan(BARIS_SAH).serve(IMAGE_ID, 'kecil');

    if (hasil.kind !== 'file') {
      throw new Error('seharusnya berkas lokal');
    }

    expect(hasil.byteSize).toBe(KECIL_BYTES);

    hasil.stream.destroy();
  });

  it('menyusun ETag kuat tanpa karakter yang merusak header', async () => {
    const hasil = await serviceDengan(BARIS_SAH).serve(IMAGE_ID, 'sedang');

    expect(hasil.etag).toMatch(/^"[-a-zA-Z0-9]+"$/);

    if (hasil.kind === 'file') {
      hasil.stream.destroy();
    }
  });

  it('mengalihkan ke CDN saat driver penyimpanan remote', async () => {
    const remote = {
      driver: 'cloudinary',
      remote: true,
      root,
      deliveryUrl: () => 'https://cdn.contoh.test/album-a/foto-sedang.webp',
    } as unknown as MediaStorageService;

    const hasil = await serviceDengan(BARIS_SAH, remote).serve(IMAGE_ID, 'sedang');

    expect(hasil.kind).toBe('remote');

    if (hasil.kind !== 'remote') {
      throw new Error('seharusnya pengalihan');
    }

    expect(hasil.location).toBe('https://cdn.contoh.test/album-a/foto-sedang.webp');
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
