import { describe, expect, it } from 'vitest';
import { storageKeysOf } from './image-keys.js';
import { localStorage } from './media-storage.js';

const KEYS = storageKeysOf('album-a/foto.webp');

describe('localStorage', () => {
  it('melaporkan driver local', () => {
    expect(localStorage().driver).toBe('local');
  });

  it('tidak pernah menyediakan URL pengalihan karena berkas disajikan langsung', () => {
    const writer = localStorage();

    expect(writer.deliveryUrl(KEYS, 'sedang')).toBeNull();
    expect(writer.deliveryUrl(KEYS, 'kecil')).toBeNull();
  });
});
