import {
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_PIXELS,
  MEDIA_VARIANT_WIDTHS,
} from '@kelas/contracts';
import sharp from 'sharp';
import { sniffImageFormat } from './image-signature.js';

const MASTER_QUALITY = 82;

const MEDIUM_QUALITY = 80;

const SMALL_QUALITY = 72;

const FLATTEN_BACKGROUND = '#ffffff';

const READABLE_FORMATS = new Set(['jpeg', 'png', 'webp']);

const UNREADABLE = 'Berkas gambar tidak dapat dibaca.';

const NOT_SUPPORTED = 'Isi berkas bukan gambar JPEG, PNG, atau WebP.';

const TOO_WIDE = `Sisi gambar melebihi ${MAX_IMAGE_DIMENSION} piksel.`;

const TOO_MANY_PIXELS = `Gambar melebihi ${MAX_IMAGE_PIXELS / 1_000_000} megapiksel.`;

export type RenderedImage = { bytes: Buffer; width: number; height: number };

export type ProcessedImage = {
  master: RenderedImage;
  medium: RenderedImage;
  small: RenderedImage;
};

export type ImageOutcome =
  | { ok: true; image: ProcessedImage }
  | { ok: false; reason: string };

function reject(reason: string): ImageOutcome {
  return { ok: false, reason };
}

function pipelineOf(source: Buffer) {
  return sharp(source, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'warning' })
    .rotate()
    .flatten({ background: FLATTEN_BACKGROUND });
}

async function inspect(source: Buffer): Promise<string | undefined> {
  const sniffed = sniffImageFormat(source);

  if (sniffed === undefined) {
    return NOT_SUPPORTED;
  }

  try {
    const meta = await sharp(source, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;

    if (meta.format !== sniffed || !READABLE_FORMATS.has(meta.format)) {
      return UNREADABLE;
    }

    if (width < 1 || height < 1) {
      return UNREADABLE;
    }

    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      return TOO_WIDE;
    }

    if (width * height > MAX_IMAGE_PIXELS) {
      return TOO_MANY_PIXELS;
    }

    return undefined;
  } catch {
    return UNREADABLE;
  }
}

async function render(
  source: Buffer,
  width: number | undefined,
  quality: number,
): Promise<RenderedImage> {
  const pipeline = pipelineOf(source);
  const scaled =
    width === undefined
      ? pipeline
      : pipeline.resize({ width, fit: 'inside', withoutEnlargement: true });
  const { data, info } = await scaled.webp({ quality }).toBuffer({ resolveWithObject: true });

  return { bytes: data, width: info.width, height: info.height };
}

export async function processImage(source: Buffer): Promise<ImageOutcome> {
  const rejection = await inspect(source);

  if (rejection !== undefined) {
    return reject(rejection);
  }

  try {
    const [master, medium, small] = await Promise.all([
      render(source, undefined, MASTER_QUALITY),
      render(source, MEDIA_VARIANT_WIDTHS.sedang, MEDIUM_QUALITY),
      render(source, MEDIA_VARIANT_WIDTHS.kecil, SMALL_QUALITY),
    ]);

    return { ok: true, image: { master, medium, small } };
  } catch {
    return reject(UNREADABLE);
  }
}