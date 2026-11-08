import path from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ImageVariant } from '@kelas/contracts';
import type { Env } from '../config/env.js';
import { cloudinaryStorage } from './cloudinary-storage.js';
import type { StorageKeys } from './image-keys.js';
import type { ProcessedImage } from './image-processor.js';
import { localStorage } from './media-storage.js';
import type { MediaDriver, MediaWriter } from './media-storage.js';

@Injectable()
export class MediaStorageService {
  private readonly writer: MediaWriter;

  private readonly mediaRoot: string;

  constructor(config: ConfigService<Env, true>) {
    const driver = config.get('MEDIA_DRIVER', { infer: true });

    this.mediaRoot = path.resolve(config.get('MEDIA_ROOT', { infer: true }));

    this.writer =
      driver === 'cloudinary'
        ? cloudinaryStorage({
            cloudName: config.get('CLOUDINARY_CLOUD_NAME', { infer: true }),
            apiKey: config.get('CLOUDINARY_API_KEY', { infer: true }),
            apiSecret: config.get('CLOUDINARY_API_SECRET', { infer: true }),
          })
        : localStorage();
  }

  get driver(): MediaDriver {
    return this.writer.driver;
  }

  get remote(): boolean {
    return this.writer.driver !== 'local';
  }

  get root(): string {
    return this.mediaRoot;
  }

  write(keys: StorageKeys, image: ProcessedImage): Promise<void> {
    return this.writer.write(this.mediaRoot, keys, image);
  }

  remove(keys: StorageKeys): Promise<void> {
    return this.writer.remove(this.mediaRoot, keys);
  }

  deliveryUrl(keys: StorageKeys, variant: ImageVariant): string | null {
    return this.writer.deliveryUrl(keys, variant);
  }
}