import { describe, expect, it } from 'vitest';
import {
  TOKEN_WARNA,
  alamatPapanPiksel,
  bacaPengaturan,
  papanDari,
  permintaanPengaturan,
} from './pengaturan.api';
import {
  alamatLampiran,
  alamatLampiranSatu,
  alamatPratinjauLampiran,
  alamatSemat,
  alamatUrutLampiran,
  ukuranBerkas,
} from './admin-pengumuman.api';
import { sumberLampiran } from './pengumuman.api';

const PENGATURAN = {
  voxelBoard: { kind: 'teks', teks: 'PPLG', warna: 'tinta' },
  updatedAt: '2026-11-08T01:00:00.000Z',
};

describe('bacaPengaturan', () => {
  it('membaca papan teks beserta warna dan waktu ubah', () => {
    const hasil = bacaPengaturan(PENGATURAN);

    expect(hasil.voxelBoard).toEqual({ kind: 'teks', teks: 'PPLG', warna: 'tinta' });
    expect(hasil.updatedAt).toBe('2026-11-08T01:00:00.000Z');
  });

  it('menerima papan matriks dengan baris sama panjang', () => {
    const hasil = bacaPengaturan({
      voxelBoard: {
        kind: 'matriks',
        baris: ['01110', '10001', '11111', '10001', '10001', '10001', '10001'],
        warna: 'hijau',
      },
      updatedAt: null,
    });

    expect(hasil.voxelBoard.kind).toBe('matriks');
  });

  it('menolak baris yang panjangnya berbeda', () => {
    expect(() =>
      bacaPengaturan({
        voxelBoard: { kind: 'matriks', baris: ['0110', '100'], warna: 'hijau' },
        updatedAt: null,
      }),
    ).toThrow();
  });
});

describe('papanDari', () => {
  it('memakai papan dari server bila ada', () => {
    expect(papanDari(bacaPengaturan(PENGATURAN))).toEqual({
      kind: 'teks',
      teks: 'PPLG',
      warna: 'tinta',
    });
  });

  it('kembali ke papan cadangan saat pengaturan belum termuat', () => {
    expect(papanDari(undefined)).toEqual({ kind: 'teks', teks: 'XI', warna: 'sinyal' });
  });
});

describe('TOKEN_WARNA', () => {
  it('memetakan setiap warna kontrak ke token CSS', () => {
    expect(Object.keys(TOKEN_WARNA).sort()).toEqual(['batu', 'hijau', 'sinyal', 'tinta']);
    expect(TOKEN_WARNA.sinyal).toBe('--color-sinyal');
  });
});

describe('alamat pengaturan', () => {
  it('memakai rute publik untuk membaca dan rute admin untuk menyimpan', () => {
    expect(permintaanPengaturan().url).toBe('/api/public/settings');
    expect(alamatPapanPiksel()).toBe('/api/admin/settings/voxel-board');
  });
});

describe('alamat lampiran pengumuman', () => {
  it('menyusun rute admin semat, unggah, urut, dan pratinjau', () => {
    expect(alamatSemat('a1')).toBe('/api/admin/announcements/a1/pin');
    expect(alamatLampiran('a1')).toBe('/api/admin/announcements/a1/attachments');
    expect(alamatUrutLampiran('a1')).toBe('/api/admin/announcements/a1/attachments/order');
    expect(alamatLampiranSatu('a1', 'l1')).toBe('/api/admin/announcements/a1/attachments/l1');
    expect(alamatPratinjauLampiran('a1', 'l1', 'kecil')).toBe(
      '/api/admin/announcements/a1/attachments/l1/media?ukuran=kecil',
    );
  });

  it('menyusun rute lampiran publik dari slug', () => {
    expect(sumberLampiran('jadwal-ujian', 'l1')).toBe(
      '/api/public/announcements/jadwal-ujian/attachments/l1',
    );
    expect(sumberLampiran('jadwal-ujian', 'l1', 'sedang')).toBe(
      '/api/public/announcements/jadwal-ujian/attachments/l1?ukuran=sedang',
    );
  });
});

describe('ukuranBerkas', () => {
  it('memilih satuan yang masuk akal', () => {
    expect(ukuranBerkas(512)).toBe('512 B');
    expect(ukuranBerkas(2048)).toBe('2 KB');
    expect(ukuranBerkas(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});
