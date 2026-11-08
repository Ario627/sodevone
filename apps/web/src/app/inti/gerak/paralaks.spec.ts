import { describe, expect, it } from 'vitest';
import { geserTerbatas, normalisasi } from './paralaks';

describe('normalisasi', () => {
  it('memberi 0 di tengah elemen', () => {
    expect(normalisasi(50, 100)).toBe(0);
  });

  it('memberi -1 di tepi kiri dan 1 di tepi kanan', () => {
    expect(normalisasi(0, 100)).toBe(-1);
    expect(normalisasi(100, 100)).toBe(1);
  });

  it('menjepit nilai di luar elemen', () => {
    expect(normalisasi(-40, 100)).toBe(-1);
    expect(normalisasi(300, 100)).toBe(1);
  });

  it('aman saat ukuran belum terukur', () => {
    expect(normalisasi(10, 0)).toBe(0);
  });
});

describe('geserTerbatas', () => {
  it('membulatkan ke piksel utuh', () => {
    expect(geserTerbatas(0.42, 5)).toBe(2);
    expect(geserTerbatas(-0.42, 5)).toBe(-2);
  });

  it('tidak melewati batas maksimum', () => {
    expect(geserTerbatas(9, 4)).toBe(4);
    expect(geserTerbatas(-9, 4)).toBe(-4);
  });

  it('memberi 0 untuk nilai nol', () => {
    expect(geserTerbatas(0, 6)).toBe(0);
  });
});
