import { jepit, jalurLembut } from './lintasan';

function angka(jalur: string): number[] {
  return (jalur.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

function jumlahPerintah(jalur: string, huruf: string): number {
  return jalur.split('').filter((karakter) => karakter === huruf).length;
}

describe('jalur lembut', () => {
  it('mengembalikan string kosong tanpa titik', () => {
    expect(jalurLembut([])).toBe('');
  });

  it('memakai perintah M saja untuk satu titik', () => {
    const jalur = jalurLembut([{ x: 12.345, y: 8 }]);

    expect(jalur).toMatch(/^M 12\.35[, ]8$/);
    expect(jumlahPerintah(jalur, 'C')).toBe(0);
  });

  it('memakai satu kurva kubik untuk setiap pasangan titik', () => {
    const jalur = jalurLembut([
      { x: 0, y: 0 },
      { x: 10, y: 40 },
      { x: 0, y: 80 },
      { x: 10, y: 120 },
    ]);

    expect(jalur.startsWith('M 0,0 ')).toBe(true);
    expect(jumlahPerintah(jalur, 'C')).toBe(3);
    expect(angka(jalur)).toHaveLength(2 + 3 * 6);
  });

  it('membulatkan koordinat sampai dua desimal', () => {
    const jalur = jalurLembut([
      { x: 1.23456, y: 2.34567 },
      { x: 3.45678, y: 4.56789 },
    ]);

    expect(jalur).toContain('1.23,2.35');
    expect(jalur).not.toMatch(/\d\.\d{3,}/);
  });

  it('tidak menghasilkan NaN saat dua titik bertumpuk', () => {
    const jalur = jalurLembut([
      { x: 5, y: 5 },
      { x: 5, y: 5 },
      { x: 5, y: 60 },
    ]);

    expect(jalur.includes('NaN')).toBe(false);
    expect(jumlahPerintah(jalur, 'C')).toBe(2);
  });

  it('membuat garis lurus bila semua x sama', () => {
    const jalur = jalurLembut([
      { x: 20, y: 0 },
      { x: 20, y: 50 },
      { x: 20, y: 100 },
    ]);

    const nilai = angka(jalur);
    const sumbuX = nilai.filter((_, i) => i % 2 === 0);

    expect(sumbuX.every((x) => x === 20)).toBe(true);
    expect(nilai.filter((_, i) => i % 2 === 1)).toEqual([0, 8.33, 33.33, 50, 66.67, 91.67, 100]);
  });

  it('mengapit progres pada rentang nol sampai satu', () => {
    expect(jepit(-4, 0, 1)).toBe(0);
    expect(jepit(0.35, 0, 1)).toBe(0.35);
    expect(jepit(9, 0, 1)).toBe(1);
  });
});
