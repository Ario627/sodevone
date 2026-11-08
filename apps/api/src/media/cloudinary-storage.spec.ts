import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cloudinaryStorage, deliveryUrlOf } from './cloudinary-storage.js';
import type { CloudinaryConfig } from './cloudinary-storage.js';
import { storageKeysOf } from './image-keys.js';
import type { ProcessedImage } from './image-processor.js';

const KONFIG: CloudinaryConfig = {
  cloudName: 'kelas-uji',
  apiKey: 'kunci-uji',
  apiSecret: 'rahasia-uji',
};

const KEYS = storageKeysOf('album-a/foto.webp');

const ROOT = '/tmp/tidak-dipakai';

function gambarUji(): ProcessedImage {
  const bytes = Buffer.from('webp-palsu');

  return {
    master: { bytes, width: 1600, height: 1200 },
    medium: { bytes, width: 1024, height: 768 },
    small: { bytes, width: 480, height: 360 },
  } as unknown as ProcessedImage;
}

function signatureDari(bentuk: FormData): string {
  const nilai = bentuk.get('signature');

  return typeof nilai === 'string' ? nilai : '';
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('deliveryUrlOf', () => {
  it('menyusun URL https dengan transformasi sesuai varian', () => {
    const sedang = deliveryUrlOf(KONFIG, KEYS, 'sedang');
    const kecil = deliveryUrlOf(KONFIG, KEYS, 'kecil');

    expect(sedang).toMatch(/^https:\/\/res\.cloudinary\.com\/kelas-uji\/image\/upload\//);
    expect(sedang).toContain('w_1024');
    expect(kecil).toContain('w_480');
    expect(sedang).toContain('f_webp');
    expect(sedang).toContain('album-a/foto.webp');
  });

  it('membuang ekstensi ganda pada public id', () => {
    expect(deliveryUrlOf(KONFIG, KEYS, 'sedang')).not.toContain('.webp.webp');
  });
});

describe('cloudinaryStorage', () => {
  it('melaporkan driver cloudinary', () => {
    expect(cloudinaryStorage(KONFIG).driver).toBe('cloudinary');
  });

  it('mengunggah hanya master lalu menandatangani field', async () => {
    const terkirim: FormData[] = [];

    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        terkirim.push(init.body as FormData);

        return new Response(JSON.stringify({ public_id: 'album-a/foto' }), { status: 200 });
      }),
    );

    await cloudinaryStorage(KONFIG).write(ROOT, KEYS, gambarUji());

    expect(terkirim).toHaveLength(1);
    expect(signatureDari(terkirim[0] as FormData)).toMatch(/^[0-9a-f]{64}$/);
    expect(terkirim[0]?.get('public_id')).toBe('album-a/foto');
    expect(terkirim[0]?.get('api_key')).toBe('kunci-uji');
    expect(terkirim[0]?.get('signature_algorithm')).toBe('sha256');
  });

  it('menandatangani tanpa menyertakan api_key pada payload tanda tangan', async () => {
    const terkirim: FormData[] = [];

    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        terkirim.push(init.body as FormData);

        return new Response('{}', { status: 200 });
      }),
    );

    await cloudinaryStorage(KONFIG).write(ROOT, KEYS, gambarUji());

    const bentuk = terkirim[0] as FormData;
    const tandaTangan = signatureDari(bentuk);
    const ulang = signatureDari(
      (() => {
        const salinan = new FormData();

        for (const [kunci, nilai] of bentuk.entries()) {
          if (kunci !== 'api_key' && kunci !== 'file' && kunci !== 'signature') {
            salinan.append(kunci, nilai as string);
          }
        }

        return salinan;
      })(),
    );

    expect(tandaTangan).not.toBe(ulang);
  });

  it('melempar galat saat Cloudinary menolak unggahan', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('ditolak', { status: 401 })),
    );

    await expect(cloudinaryStorage(KONFIG).write(ROOT, KEYS, gambarUji())).rejects.toThrow(
      'Unggahan ke Cloudinary gagal',
    );
  });

  it('melempar galat saat jaringan gagal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('jaringan mati');
      }),
    );

    await expect(cloudinaryStorage(KONFIG).write(ROOT, KEYS, gambarUji())).rejects.toThrow(
      'Unggahan ke Cloudinary gagal',
    );
  });

  it('tidak melempar saat penghapusan gagal agar basis data tetap konsisten', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('galat', { status: 500 })),
    );

    await expect(cloudinaryStorage(KONFIG).remove(ROOT, KEYS)).resolves.toBeUndefined();
  });
});
