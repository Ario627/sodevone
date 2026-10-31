import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveWithinRoot } from './storage-path.js';

const ROOT = '/srv/kelas/media';

describe('resolveWithinRoot', () => {
  it('mengizinkan kunci bersarang yang wajar', () => {
    expect(resolveWithinRoot(ROOT, 'album-id/budi-sedang.webp')).toBe(
      path.join(ROOT, 'album-id', 'budi-sedang.webp'),
    );
  });

  it('menolak keluar dari direktori akar', () => {
    for (const kunci of [
      '../rahasia.env',
      '../../etc/passwd',
      'album/../../etc/passwd',
      '/etc/passwd',
      'album\\..\\..\\etc\\passwd',
    ]) {
      const hasil = resolveWithinRoot(ROOT, kunci);

      expect(hasil === null || hasil.startsWith(`${ROOT}${path.sep}`)).toBe(true);
    }
  });

  it('menolak kunci kosong dan yang memuat byte nol', () => {
    expect(resolveWithinRoot(ROOT, '')).toBeNull();
    expect(resolveWithinRoot(ROOT, 'album/\0x.webp')).toBeNull();
  });

  it('tidak membiarkan awalan nama yang mirip lolos', () => {
    expect(resolveWithinRoot(ROOT, '../media-lain/x.webp')).toBeNull();
  });
});
