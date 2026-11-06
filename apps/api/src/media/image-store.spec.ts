import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ProcessedImage } from './image-processor.js';
import { removeImageFiles, writeImageFiles } from './image-store.js';
import { storageKeysOf } from './image-keys.js';

const ALBUM_ID = '11111111-1111-4111-8111-111111111111';

const IMAGE_ID = '22222222-2222-4222-8222-222222222222';

const STORAGE_KEY = `${ALBUM_ID}/${IMAGE_ID}.webp`;

const KEYS = storageKeysOf(STORAGE_KEY);

function imageOf(): ProcessedImage {
  return {
    master: { bytes: Buffer.from('master'), width: 1600, height: 900 },
    medium: { bytes: Buffer.from('sedang'), width: 1024, height: 576 },
    small: { bytes: Buffer.from('kecil'), width: 480, height: 270 },
  };
}

let root = '';

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'kelas-store-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('writeImageFiles', () => {
  it('menulis tiga berkas dengan isi yang sesuai', async () => {
    await writeImageFiles(root, KEYS, imageOf());

    await expect(readFile(path.join(root, KEYS.master), 'utf8')).resolves.toBe('master');
    await expect(readFile(path.join(root, KEYS.medium), 'utf8')).resolves.toBe('sedang');
    await expect(readFile(path.join(root, KEYS.small), 'utf8')).resolves.toBe('kecil');
  });

  it('membuat direktori album secara otomatis', async () => {
    await writeImageFiles(root, KEYS, imageOf());

    await expect(stat(path.join(root, ALBUM_ID))).resolves.toMatchObject({ mode: expect.any(Number) });
  });

  it('membatasi izin berkas agar hanya dapat dibaca proses aplikasi', async () => {
    await writeImageFiles(root, KEYS, imageOf());

    const info = await stat(path.join(root, KEYS.master));

    expect(info.mode & 0o777).toBe(0o600);
  });

  it('menolak kunci yang keluar dari akar penyimpanan', async () => {
    const escaped = storageKeysOf('../keluar.webp');

    await expect(writeImageFiles(root, escaped, imageOf())).rejects.toThrow('ditolak');
  });

  it('tidak menimpa berkas yang sudah ada', async () => {
    await writeImageFiles(root, KEYS, imageOf());

    await expect(writeImageFiles(root, KEYS, imageOf())).rejects.toThrow();
  });
});

describe('removeImageFiles', () => {
  it('menghapus ketiga berkas', async () => {
    await writeImageFiles(root, KEYS, imageOf());
    await removeImageFiles(root, KEYS);

    await expect(stat(path.join(root, KEYS.master))).rejects.toThrow();
    await expect(stat(path.join(root, KEYS.small))).rejects.toThrow();
  });

  it('tidak melempar galat ketika berkas sudah tidak ada', async () => {
    await expect(removeImageFiles(root, KEYS)).resolves.toBeUndefined();
  });

  it('menolak kunci yang keluar dari akar penyimpanan', async () => {
    await expect(removeImageFiles(root, storageKeysOf('../keluar.webp'))).rejects.toThrow(
      'ditolak',
    );
  });
});
