import { createHash } from 'node:crypto';
import { MEDIA_VARIANT_WIDTHS, type ImageVariant } from '@kelas/contracts';
import type { StorageKeys } from './image-keys.js';
import type { ProcessedImage } from './image-processor.js';
import type { MediaWriter } from './media-storage.js';

const UPLOAD_ENDPOINT = 'https://api.cloudinary.com/v1_1';

const DELIVERY_ENDPOINT = 'https://res.cloudinary.com';

const SIGNATURE_ALGORITHM = 'sha256';

const REQUEST_TIMEOUT_MS = 20_000;

const EXTENSION = '.webp';

const VARIANT_TRANSFORMS: Record<ImageVariant, string> = {
  sedang: `c_limit,w_${MEDIA_VARIANT_WIDTHS.sedang},q_80,f_webp`,
  kecil: `c_limit,w_${MEDIA_VARIANT_WIDTHS.kecil},q_72,f_webp`,
};

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

type CloudinaryResponse = { ok: boolean; error?: unknown };

function publicIdOf(keys: StorageKeys): string {
  return keys.master.endsWith(EXTENSION) ? keys.master.slice(0, -EXTENSION.length) : keys.master;
}

function signatureOf(params: Record<string, string>, apiSecret: string): string {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return createHash(SIGNATURE_ALGORITHM).update(`${payload}${apiSecret}`).digest('hex');
}

function signedFields(
  config: CloudinaryConfig,
  extra: Record<string, string>,
): Record<string, string> {
  const params: Record<string, string> = {
    ...extra,
    timestamp: String(Date.now()),
    signature_algorithm: SIGNATURE_ALGORITHM,
  };

  return {
    ...params,
    api_key: config.apiKey,
    signature: signatureOf(params, config.apiSecret),
  };
}

async function postForm(
  url: string,
  fields: Record<string, string>,
  file?: { bytes: Buffer; mimeType: string },
): Promise<CloudinaryResponse> {
  const body = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    body.append(key, value);
  }

  if (file !== undefined) {
    body.append('file', new Blob([new Uint8Array(file.bytes)], { type: file.mimeType }), 'berkas');
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { ok: false, error: await response.text() };
    }

    const parsed = (await response.json()) as { error?: unknown };

    return parsed.error === undefined ? { ok: true } : { ok: false, error: parsed.error };
  } catch (error) {
    return { ok: false, error };
  }
}

async function uploadMaster(
  config: CloudinaryConfig,
  keys: StorageKeys,
  image: ProcessedImage,
): Promise<void> {
  const fields = signedFields(config, {
    public_id: publicIdOf(keys),
    overwrite: 'false',
    invalidate: 'true',
  });

  const result = await postForm(
    `${UPLOAD_ENDPOINT}/${encodeURIComponent(config.cloudName)}/image/upload`,
    fields,
    { bytes: image.master.bytes, mimeType: 'image/webp' },
  );

  if (!result.ok) {
    throw new Error('Unggahan ke Cloudinary gagal');
  }
}

async function destroyAsset(config: CloudinaryConfig, keys: StorageKeys): Promise<void> {
  const fields = signedFields(config, { public_id: publicIdOf(keys), invalidate: 'true' });

  await postForm(
    `${UPLOAD_ENDPOINT}/${encodeURIComponent(config.cloudName)}/image/destroy`,
    fields,
  );
}

export function deliveryUrlOf(
  config: CloudinaryConfig,
  keys: StorageKeys,
  variant: ImageVariant,
): string {
  const publicId = publicIdOf(keys);
  const transformation = VARIANT_TRANSFORMS[variant];

  return `${DELIVERY_ENDPOINT}/${encodeURIComponent(config.cloudName)}/image/upload/${transformation}/${publicId}${EXTENSION}`;
}

export function cloudinaryStorage(config: CloudinaryConfig): MediaWriter {
  return {
    driver: 'cloudinary',
    write: (_root, keys, image) => uploadMaster(config, keys, image),
    remove: (_root, keys) => destroyAsset(config, keys),
    deliveryUrl: (keys, variant) => deliveryUrlOf(config, keys, variant),
  };
}