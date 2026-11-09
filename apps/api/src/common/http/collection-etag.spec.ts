import { describe, expect, it } from 'vitest';
import { collectionEtagOf } from './collection-etag.js';

const SAFE_ETAG = /^"[\x21\x23-\x7E]*"$/;

describe('collectionEtagOf', () => {
  it('memakai penanda kosong saat belum ada data', () => {
    expect(collectionEtagOf(undefined, 0)).toBe('"kosong-0"');
  });

  it('menyusun ETag dari waktu ubah dan jumlah baris', () => {
    expect(collectionEtagOf('2026-10-29T02:00:00.000Z', 4)).toBe('"2026-10-29T02-00-00-000Z-4"');
  });

  it('mengganti format teks postgres menjadi ETag yang sah', () => {
    expect(collectionEtagOf('2026-10-29 02:00:00+00', 2)).toBe('"2026-10-29-02-00-00-00-2"');
  });

  it('tidak pernah menghasilkan karakter terlarang di dalam tanda kutip', () => {
    const hasil = collectionEtagOf('2026-10-29 02:00:00.123+07 "aneh",\\x', 1);

    expect(hasil).toMatch(SAFE_ETAG);
  });

  it('membedakan dua waktu yang hanya berbeda milidetik', () => {
    const awal = collectionEtagOf('2026-10-29T02:00:00.000Z', 1);
    const akhir = collectionEtagOf('2026-10-29T02:00:00.001Z', 1);

    expect(awal).not.toBe(akhir);
  });
});
