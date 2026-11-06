import sharp from 'sharp';
import type { Metadata, Sharp } from 'sharp';
import { describe, expect, it } from 'vitest';
import { MEDIA_VARIANT_WIDTHS, MAX_IMAGE_DIMENSION } from '@kelas/contracts';
import { processImage } from './image-processor.js';

const COLOR = '#3366cc';

async function solid(width: number, height: number): Promise<Sharp> {
  return sharp({
    create: { width, height, channels: 3, background: COLOR },
  });
}

async function jpegOf(width: number, height: number): Promise<Buffer> {
  return (await solid(width, height)).jpeg().toBuffer();
}

async function pngWithAlpha(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } },
  })
    .png()
    .toBuffer();
}

async function webpOf(width: number, height: number): Promise<Buffer> {
  return (await solid(width, height)).webp().toBuffer();
}

async function metadataOf(bytes: Buffer): Promise<Metadata> {
  return sharp(bytes).metadata();
}

describe('processImage', () => {
  it('menghasilkan master, sedang, dan kecil dalam format WebP', async () => {
    const hasil = await processImage(await jpegOf(1600, 900));

    expect(hasil.ok).toBe(true);

    if (!hasil.ok) {
      return;
    }

    expect(hasil.image.master.width).toBe(1600);
    expect(hasil.image.master.height).toBe(900);
    expect(hasil.image.medium.width).toBe(MEDIA_VARIANT_WIDTHS.sedang);
    expect(hasil.image.small.width).toBe(MEDIA_VARIANT_WIDTHS.kecil);
    expect(hasil.image.small.height).toBe(Math.round((900 / 1600) * MEDIA_VARIANT_WIDTHS.kecil));

    for (const part of [hasil.image.master, hasil.image.medium, hasil.image.small]) {
      expect((await metadataOf(part.bytes)).format).toBe('webp');
    }
  });

  it('tidak memperbesar gambar yang lebih kecil dari lebar turunan', async () => {
    const hasil = await processImage(await jpegOf(300, 200));

    expect(hasil.ok).toBe(true);

    if (!hasil.ok) {
      return;
    }

    expect(hasil.image.medium.width).toBe(300);
    expect(hasil.image.small.width).toBe(300);
  });

  it('menerima PNG dengan alpha dan meratakannya pada latar putih', async () => {
    const hasil = await processImage(await pngWithAlpha(400, 400));

    expect(hasil.ok).toBe(true);

    if (!hasil.ok) {
      return;
    }

    expect((await metadataOf(hasil.image.master.bytes)).hasAlpha).toBe(false);
  });

  it('menerima WebP sebagai masukan', async () => {
    const hasil = await processImage(await webpOf(800, 600));

    expect(hasil.ok).toBe(true);
  });

  it('membuang metadata EXIF dari hasil', async () => {
    const source = await (await solid(320, 240))
      .withMetadata({ exif: { IFD0: { Copyright: 'kelas' } } })
      .jpeg()
      .toBuffer();

    expect((await metadataOf(source)).exif).toBeDefined();

    const hasil = await processImage(source);

    expect(hasil.ok).toBe(true);

    if (!hasil.ok) {
      return;
    }

    for (const part of [hasil.image.master, hasil.image.medium, hasil.image.small]) {
      expect((await metadataOf(part.bytes)).exif).toBeUndefined();
    }
  });

  it('menolak berkas teks yang dinamai gambar', async () => {
    const hasil = await processImage(Buffer.from('ini bukan gambar, hanya teks biasa.', 'utf8'));

    expect(hasil).toEqual({ ok: false, reason: expect.stringContaining('bukan gambar') });
  });

  it('menolak SVG walaupun berbasis teks XML', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script/></svg>',
      'utf8',
    );

    expect((await processImage(svg)).ok).toBe(false);
  });

  it('menolak gambar yang lebih lebar dari batas dimensi', async () => {
    const hasil = await processImage(await jpegOf(MAX_IMAGE_DIMENSION + 1, 8));

    expect(hasil.ok).toBe(false);

    if (!hasil.ok) {
      expect(hasil.reason).toContain(String(MAX_IMAGE_DIMENSION));
    }
  });

  it('menolak JPEG yang terpotong', async () => {
    const utuh = await jpegOf(800, 600);
    const separuh = utuh.subarray(0, Math.floor(utuh.length / 2));

    expect((await processImage(separuh)).ok).toBe(false);
  });

  it('menghormati orientasi EXIF sehingga sisi tidak tertukar', async () => {
    const source = await (await solid(400, 200)).withMetadata({ orientation: 6 }).jpeg().toBuffer();

    const hasil = await processImage(source);

    expect(hasil.ok).toBe(true);

    if (!hasil.ok) {
      return;
    }

    expect(hasil.image.master.width).toBe(200);
    expect(hasil.image.master.height).toBe(400);
  });
});
