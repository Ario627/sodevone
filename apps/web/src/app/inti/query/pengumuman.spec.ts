import { describe, expect, it } from 'vitest';
import {
  adaFilter,
  arsipDari,
  daftarQueryDari,
  halamanDari,
  kategoriDari,
  kataKunciDari,
  tautanDaftar,
} from './pengumuman';

describe('halamanDari', () => {
  it('menormalkan nilai yang tidak valid menjadi halaman 1', () => {
    expect(halamanDari(undefined)).toBe(1);
    expect(halamanDari('abc')).toBe(1);
    expect(halamanDari('0')).toBe(1);
    expect(halamanDari('-2')).toBe(1);
    expect(halamanDari('')).toBe(1);
  });

  it('membatasi halaman pada rentang yang didukung server', () => {
    expect(halamanDari('3')).toBe(3);
    expect(halamanDari('1000')).toBe(1000);
    expect(halamanDari('9999')).toBe(1000);
    expect(halamanDari('100000')).toBe(1);
  });
});

describe('kategoriDari', () => {
  it('hanya menerima kategori yang dikenal', () => {
    expect(kategoriDari('akademik')).toBe('akademik');
    expect(kategoriDari('KEGIATAN')).toBeUndefined();
    expect(kategoriDari('lainnya')).toBeUndefined();
    expect(kategoriDari(undefined)).toBeUndefined();
  });
});

describe('kataKunciDari', () => {
  it('membuang spasi di tepi dan menolak kata kunci kosong', () => {
    expect(kataKunciDari('  pensi  ')).toBe('pensi');
    expect(kataKunciDari('   ')).toBeUndefined();
    expect(kataKunciDari(undefined)).toBeUndefined();
  });

  it('menolak kata kunci yang melewati batas panjang', () => {
    expect(kataKunciDari('a'.repeat(121))).toBeUndefined();
  });
});

describe('arsipDari', () => {
  it('hanya menghidupkan arsip pada nilai true', () => {
    expect(arsipDari('true')).toBe(true);
    expect(arsipDari('false')).toBe(false);
    expect(arsipDari('1')).toBe(false);
    expect(arsipDari(undefined)).toBe(false);
  });
});

describe('daftarQueryDari', () => {
  it('menyusun query lengkap dengan jumlah per halaman tetap', () => {
    expect(
      daftarQueryDari({ page: '2', kategori: 'kegiatan', q: ' pensi ', arsip: 'true' }),
    ).toEqual({
      page: 2,
      perPage: 10,
      kategori: 'kegiatan',
      q: 'pensi',
      arsip: true,
    });
  });
});

describe('tautanDaftar', () => {
  it('menghilangkan nilai bawaan agar URL tetap pendek', () => {
    expect(
      tautanDaftar({ page: 1, perPage: 10, kategori: undefined, q: undefined, arsip: false }, 1),
    ).toEqual({});
  });

  it('mempertahankan filter saat berpindah halaman', () => {
    expect(
      tautanDaftar({ page: 1, perPage: 10, kategori: 'umum', q: 'rapat', arsip: true }, 3),
    ).toEqual({ page: '3', kategori: 'umum', q: 'rapat', arsip: 'true' });
  });
});

describe('adaFilter', () => {
  it('membedakan pencarian tanpa filter dari pencarian dengan filter', () => {
    expect(adaFilter({ page: 1, perPage: 10, arsip: false })).toBe(false);
    expect(adaFilter({ page: 1, perPage: 10, arsip: true })).toBe(true);
    expect(adaFilter({ page: 1, perPage: 10, q: 'ujian', arsip: false })).toBe(true);
  });
});
