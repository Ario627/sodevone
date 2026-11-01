import { describe, expect, it } from 'vitest';
import {
  permintaanDaftarAlbum,
  permintaanDetailAlbum,
  sumberFoto,
  sumberSampul,
  srcsetFoto,
} from './galeri.api';

describe('permintaanDaftarAlbum', () => {
  it('menyertakan nomor halaman dan jumlah per halaman', () => {
    const hasil = permintaanDaftarAlbum({ page: 2, perPage: 12 });

    expect(hasil.url).toBe('/api/public/albums');
    expect(hasil.params).toEqual({ page: '2', perPage: '12' });
  });
});

describe('permintaanDetailAlbum', () => {
  it('menyusun jalur album dengan slug yang sudah di-encode', () => {
    const hasil = permintaanDetailAlbum('pensi-2026', { page: 1, perPage: 24 });

    expect(hasil.url).toBe('/api/public/albums/pensi-2026');
    expect(hasil.params).toEqual({ page: '1', perPage: '24' });
  });

  it('tidak membiarkan slug menyusup ke jalur lain', () => {
    const hasil = permintaanDetailAlbum('../admin', { page: 1, perPage: 24 });

    expect(hasil.url).not.toContain('/admin');
    expect(hasil.url).toBe('/api/public/albums/..%2Fadmin');
  });
});

describe('sumberFoto', () => {
  it('menyusun URL media dengan varian yang diminta', () => {
    expect(sumberFoto('44444444-4444-4444-8444-444444444444', 'sedang')).toBe(
      '/api/media/44444444-4444-4444-8444-444444444444?ukuran=sedang',
    );
    expect(sumberFoto('44444444-4444-4444-8444-444444444444', 'kecil')).toContain('ukuran=kecil');
  });

  it('meng-encode id agar tidak merusak jalur', () => {
    expect(sumberFoto('a/b?c', 'kecil')).toBe('/api/media/a%2Fb%3Fc?ukuran=kecil');
  });
});

describe('srcsetFoto', () => {
  it('menawarkan dua lebar sesuai kontrak turunan', () => {
    const hasil = srcsetFoto('44444444-4444-4444-8444-444444444444');

    expect(hasil).toContain('ukuran=kecil 480w');
    expect(hasil).toContain('ukuran=sedang 1024w');
    expect(hasil.split(',')).toHaveLength(2);
  });
});

describe('sumberSampul', () => {
  it('memakai varian kecil agar daftar album tetap ringan', () => {
    expect(sumberSampul('44444444-4444-4444-8444-444444444444')).toContain('ukuran=kecil');
  });
});
