import { describe, expect, it } from 'vitest';
import { VoxelBoardInputSchema, VoxelBoardSchema } from '@kelas/contracts';

function barisPapan(panjang: number, jumlah: number): string[] {
  return Array.from({ length: jumlah }, () => '1'.repeat(panjang));
}

function voksel(nilai: unknown) {
  return VoxelBoardSchema.safeParse(nilai);
}

describe('VoxelBoardSchema bentuk teks', () => {
  it('menerima teks pendek dengan warna sah', () => {
    expect(voksel({ kind: 'teks', teks: 'XI', warna: 'sinyal' }).success).toBe(true);
  });

  it('memangkas spasi di ujung teks', () => {
    const hasil = voksel({ kind: 'teks', teks: '  XII  ', warna: 'tinta' });

    expect(hasil.success && hasil.data.kind === 'teks' && hasil.data.teks).toBe('XII');
  });

  it('menolak teks kosong', () => {
    expect(voksel({ kind: 'teks', teks: '   ', warna: 'sinyal' }).success).toBe(false);
  });

  it('menolak teks lebih dari enam belas karakter', () => {
    expect(voksel({ kind: 'teks', teks: 'X'.repeat(17), warna: 'sinyal' }).success).toBe(false);
  });

  it('menolak warna di luar daftar', () => {
    expect(voksel({ kind: 'teks', teks: 'XI', warna: 'ungu' }).success).toBe(false);
  });

  it('menolak properti tambahan', () => {
    expect(voksel({ kind: 'teks', teks: 'XI', warna: 'sinyal', ukuran: 3 }).success).toBe(false);
  });
});

describe('VoxelBoardSchema bentuk matriks', () => {
  it('menerima matriks lima kolom tujuh baris', () => {
    expect(voksel({ kind: 'matriks', baris: barisPapan(5, 7), warna: 'batu' }).success).toBe(true);
  });

  it('menolak baris berisi karakter selain nol dan satu', () => {
    expect(
      voksel({
        kind: 'matriks',
        baris: ['11111', '10001', '10x01', '10001', '10001', '10001', '11111'],
        warna: 'batu',
      }).success,
    ).toBe(false);
  });

  it('menolak baris yang panjangnya tidak seragam', () => {
    expect(voksel({ kind: 'matriks', baris: ['11111', '1001'], warna: 'batu' }).success).toBe(
      false,
    );
  });

  it('menolak papan kurang dari tujuh baris', () => {
    expect(voksel({ kind: 'matriks', baris: barisPapan(5, 6), warna: 'batu' }).success).toBe(false);
  });

  it('menolak papan lebih dari dua puluh empat baris', () => {
    expect(voksel({ kind: 'matriks', baris: barisPapan(5, 25), warna: 'batu' }).success).toBe(
      false,
    );
  });

  it('menolak papan lebih dari empat puluh delapan kolom', () => {
    expect(voksel({ kind: 'matriks', baris: barisPapan(49, 7), warna: 'batu' }).success).toBe(
      false,
    );
  });

  it('menerima papan lebar untuk kata panjang', () => {
    expect(voksel({ kind: 'matriks', baris: barisPapan(48, 7), warna: 'batu' }).success).toBe(true);
  });
});

describe('VoxelBoardInputSchema', () => {
  it('membungkus papan dalam properti voxelBoard', () => {
    expect(
      VoxelBoardInputSchema.safeParse({ voxelBoard: { kind: 'teks', teks: 'XI', warna: 'sinyal' } })
        .success,
    ).toBe(true);
  });

  it('menolak bodi tanpa voxelBoard', () => {
    expect(VoxelBoardInputSchema.safeParse({ teks: 'XI' }).success).toBe(false);
  });
});
