import { describe, expect, it } from 'vitest';
import {
  hariBulan,
  jamTeks,
  rentangJam,
  tahunAjaran,
  tanggalJamTeks,
  tanggalPanjangTeks,
  tanggalTeks,
} from './tanggal';

const PAGI = '2026-10-30T00:05:00.000Z';

const SIANG = '2026-10-30T07:05:00.000Z';

describe('tanggalTeks', () => {
  it('memakai zona Asia/Jakarta dan bulan disingkat', () => {
    expect(tanggalTeks(PAGI)).toBe('30 Okt 2026');
  });

  it('menggeser tanggal saat waktu UTC masih hari sebelumnya', () => {
    expect(tanggalTeks('2026-10-29T18:30:00.000Z')).toBe('30 Okt 2026');
  });

  it('memberi teks cadangan untuk nilai yang tidak bisa dibaca', () => {
    expect(tanggalTeks('bukan tanggal')).toBe('Tanggal tidak dikenal');
  });
});

describe('jamTeks', () => {
  it('memakai titik sebagai pemisah jam dan menit', () => {
    expect(jamTeks(SIANG)).toBe('14.05');
  });

  it('memakai siklus 0-23 untuk tengah malam', () => {
    expect(jamTeks('2026-10-29T17:00:00.000Z')).toBe('00.00');
  });
});

describe('tanggalJamTeks', () => {
  it('menggabungkan tanggal dan jam', () => {
    expect(tanggalJamTeks(SIANG)).toBe('30 Okt 2026, 14.05');
  });
});

describe('tanggalPanjangTeks', () => {
  it('menulis nama hari dan bulan lengkap', () => {
    expect(tanggalPanjangTeks(SIANG)).toBe('Jumat, 30 Oktober 2026');
  });
});

describe('rentangJam', () => {
  it('menampilkan satu jam bila waktu selesai kosong', () => {
    expect(rentangJam(SIANG, null)).toBe('14.05');
  });

  it('menampilkan rentang pada hari yang sama', () => {
    expect(rentangJam(SIANG, '2026-10-30T09:00:00.000Z')).toBe('14.05–16.00');
  });

  it('menampilkan kedua tanggal saat kegiatan melewati tengah malam', () => {
    expect(rentangJam(SIANG, '2026-10-30T18:00:00.000Z')).toBe(
      '30 Okt 2026, 14.05 – 31 Okt 2026, 01.00',
    );
  });
});

describe('hariBulan', () => {
  it('memecah tanggal menjadi hari dua digit dan bulan huruf besar', () => {
    expect(hariBulan(SIANG)).toEqual({ hari: '30', bulan: 'OKT', tahun: '2026' });
  });

  it('memakai zona Jakarta sehingga tanggal ikut bergeser', () => {
    expect(hariBulan('2026-10-29T18:30:00.000Z')).toEqual({
      hari: '30',
      bulan: 'OKT',
      tahun: '2026',
    });
  });

  it('memberi nilai cadangan yang lebarnya sama untuk tanggal rusak', () => {
    expect(hariBulan('bukan tanggal')).toEqual({ hari: '--', bulan: '---', tahun: '----' });
  });
});

describe('tahunAjaran', () => {
  it('memulai tahun ajaran pada Juli', () => {
    expect(tahunAjaran(new Date('2026-06-30T03:00:00.000Z'))).toBe('2025/2026');
    expect(tahunAjaran(new Date('2026-07-01T03:00:00.000Z'))).toBe('2026/2027');
  });

  it('memakai tahun ajaran berjalan pada November', () => {
    expect(tahunAjaran(new Date('2026-11-01T03:00:00.000Z'))).toBe('2026/2027');
  });
});
