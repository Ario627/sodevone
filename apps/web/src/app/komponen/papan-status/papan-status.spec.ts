import { dua, sisa } from './papan-status';

describe('papan status', () => {
  it('memberi nol di depan supaya lebarnya tetap', () => {
    expect(dua(0)).toBe('00');
    expect(dua(7)).toBe('07');
    expect(dua(59)).toBe('59');
  });

  it('tidak menampilkan nilai negatif', () => {
    expect(dua(-9)).toBe('00');
  });

  it('memakai format jam saat kurang dari sehari', () => {
    expect(sisa(3 * 3_600_000 + 4 * 60_000 + 5_000)).toBe('03:04:05');
    expect(sisa(59_000)).toBe('00:00:59');
  });

  it('memakai format hari saat lebih dari sehari', () => {
    expect(sisa(2 * 86_400_000 + 3 * 3_600_000)).toBe('2 hari 03:00:00');
    expect(sisa(86_400_000)).toBe('1 hari 00:00:00');
  });

  it('berhenti di nol ketika waktunya sudah lewat', () => {
    expect(sisa(-5_000)).toBe('00:00:00');
    expect(sisa(0)).toBe('00:00:00');
  });
});
