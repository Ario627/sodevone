import type { ImageVariant } from '@kelas/contracts';
import type { StorageKeys } from './image-keys.js';
import type { ProcessedImage } from './image-processor.js';
import { removeImageFiles, writeImageFiles } from './image-store.js';

export type MediaDriver = 'local' | 'cloudinary';

export type MediaWriter = {
  readonly driver: MediaDriver;
  write(root: string, keys: StorageKeys, image: ProcessedImage): Promise<void>;
  remove(root: string, keys: StorageKeys): Promise<void>;
  deliveryUrl(keys: StorageKeys, variant: ImageVariant): string | null;
};

export function localStorage(): MediaWriter {
  return {
    driver: 'local',
    write: (root, keys, image) => writeImageFiles(root, keys, image),
    remove: (root, keys) => removeImageFiles(root, keys),
    deliveryUrl: () => null,
  };
}