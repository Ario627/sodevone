import { describe, expect, it } from 'vitest';
import { bingkaiDekode, progresDekode } from './dekode';

const TETAP = () => 0.5;

const HURUF_ATAU_ANGKA = /[\p{L}\p{N}]/u;

describe('progresDekode', () => {
  it('memberi 0 di awal dan 1 di akhir', () => {
    expect(progresDekode(0, 500)).toBe(0);
    expect(progresDekode(500, 500)).toBe(1);
    expect(progresDekode(9999, 500)).toBe(1);
  });

  it('memakai pelandaian keluar sehingga awal lebih cepat', () => {
    const tengah = progresDekode(250, 500);

    expect(tengah).toBeGreaterThan(0.5);
    expect(tengah).toBeLessThan(1);
  });

  it('selesai seketika saat durasi tidak bermakna', () => {
    expect(progresDekode(0, 0)).toBe(1);
    expect(progresDekode(10, 10)).toBe(1);
  });
});

describe('bingkaiDekode', () => {
  it('mengembalikan teks apa adanya saat progres penuh', () => {
    expect(bingkaiDekode('Pengumuman', 1, TETAP)).toBe('Pengumuman');
  });

  it('mempertahankan panjang teks agar tata letak tidak melompat', () => {
    for (const progres of [0, 0.25, 0.5, 0.9]) {
      expect(bingkaiDekode('Jadwal Ujian', progres, TETAP)).toHaveLength('Jadwal Ujian'.length);
    }
  });

  it('mempertahankan spasi asli di semua tahap', () => {
    expect(bingkaiDekode('Jadwal Ujian', 0, TETAP).charAt(6)).toBe(' ');
  });

  it('tidak membocorkan huruf asli sebelum waktunya', () => {
    expect(bingkaiDekode('Agenda', 0, TETAP)).not.toMatch(HURUF_ATAU_ANGKA);
  });

  it('membuka paling banyak seperlima karakter sebagai glyph di awal animasi', () => {
    const hasil = bingkaiDekode('SepuluhHur', 0, TETAP);

    const sisa = [...hasil].filter((karakter) => karakter !== '\u00a0').length;

    expect(sisa).toBeGreaterThan(0);
    expect(sisa).toBeLessThanOrEqual(2);
  });

  it('membuka karakter dari kiri ke kanan', () => {
    expect(bingkaiDekode('ABCDEFGHIJ', 0.5, TETAP).startsWith('ABCDE')).toBe(true);
  });

  it('memakai indeks glyph yang sah untuk nilai acak ekstrem', () => {
    const akhir = bingkaiDekode('Teks', 0, () => 0.999999);

    expect(akhir).toHaveLength(4);
    expect(akhir).not.toContain('undefined');
  });
});
