import { describe, expect, it } from 'vitest';
import { slugVariant, slugify } from './slug.js';

describe('slugify', () => {
  it('mengubah kalimat menjadi slug huruf kecil bertanda hubung', () => {
    expect(slugify('Perubahan Jadwal Ujian Besok')).toBe('perubahan-jadwal-ujian-besok');
  });

  it('membuang diakritik tanpa menyisakan tanda baca', () => {
    expect(slugify('Rapat Wali Murid — Sesi “Pertama”')).toBe('rapat-wali-murid-sesi-pertama');
  });

  it('merapikan tanda hubung berlebih dan di tepi', () => {
    expect(slugify('  --Pensi  2026--  ')).toBe('pensi-2026');
  });

  it('memotong panjang tanpa menyisakan tanda hubung di akhir', () => {
    const hasil = slugify('a'.repeat(118) + ' b');

    expect(hasil.length).toBeLessThanOrEqual(120);
    expect(hasil.endsWith('-')).toBe(false);
  });

  it('memakai slug cadangan ketika judul tidak punya huruf atau angka', () => {
    expect(slugify('!!! ???')).toBe('pengumuman');
  });

  it('menjaga angka saja tetap menjadi slug sah', () => {
    expect(slugify('2026')).toBe('2026');
  });
});

describe('slugVariant', () => {
  it('menambahkan akhiran angka pada slug dasar', () => {
    expect(slugVariant('pensi-sekolah', 2)).toBe('pensi-sekolah-2');
  });

  it('memotong slug dasar agar akhiran tetap muat dalam batas', () => {
    const hasil = slugVariant('a'.repeat(130), 12);

    expect(hasil.length).toBeLessThanOrEqual(120);
    expect(hasil.endsWith('-12')).toBe(true);
  });
});