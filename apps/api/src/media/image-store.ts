import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveWithinRoot } from '../common/media/storage-path.js';
import type { StorageKeys } from './image-keys.js';
import type { ProcessedImage } from './image-processor.js';

const FILE_MODE = 0o600;

const DIRECTORY_MODE = 0o700;

const MISSING_FILE = 'ENOENT';

function absoluteOf(root: string, key: string): string {
  const resolved = resolveWithinRoot(root, key);

  if (resolved === null) {
    throw new Error('Kunci penyimpanan gambar ditolak');
  }

  return resolved;
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === MISSING_FILE
  );
}

export async function removeImageFiles(root: string, keys: StorageKeys): Promise<void> {
  for (const key of [keys.master, keys.medium, keys.small]) {
    try {
      await unlink(absoluteOf(root, key));
    } catch (error) {
      if (!isMissing(error)) {
        throw error;
      }
    }
  }
}

export async function writeImageFiles(
  root: string,
  keys: StorageKeys,
  image: ProcessedImage,
): Promise<void> {
  const directory = absoluteOf(root, path.dirname(keys.master));

  await mkdir(directory, { recursive: true, mode: DIRECTORY_MODE });

  const entries: Array<[key: string, bytes: Buffer]> = [
    [keys.master, image.master.bytes],
    [keys.medium, image.medium.bytes],
    [keys.small, image.small.bytes],
  ];

  try {
    for (const [key, bytes] of entries) {
      await writeFile(absoluteOf(root, key), bytes, { mode: FILE_MODE, flag: 'wx' });
    }
  } catch (error) {
    await removeImageFiles(root, keys).catch(() => undefined);

    throw error;
  }
}