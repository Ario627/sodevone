import { describe, expect, it } from 'vitest';
import { FOTO_PER_HALAMAN, GALERI_PER_HALAMAN, tautanAlbum, tautanFoto } from './galeri';
import { halamanDari, halamanTautan } from './halaman';

describe('halamanDari', () => {
  it('menormalkan nilai tidak terbaca menjadi halaman 1', () => {
    for (const nilai of [undefined, '', 'abc', '0', '-3', '2.5', '100000', ' 2 ']) {
      expect(halamanDari(nilai)).toBe(1);
    }
  });

  it('menerima halaman dalam rentang server', () => {
    expect(halamanDari('1')).toBe(1);
    expect(halamanDari('7')).toBe(7);
    expect(halamanDari('1000')).toBe(1000);
  });
});

describe('halamanTautan', () => {
  it('menghilangkan parameter halaman pertama agar URL tetap pendek', () => {
    expect(halamanTautan(1)).toEqual({});
  });

  it('menyertakan halaman pada query saat lebih dari satu', () => {
    expect(halamanTautan(3)).toEqual({ page: '3' });
  });
});

describe('galeri', () => {
  it('memakai batas per halaman yang sama dengan kontrak server', () => {
    expect(GALERI_PER_HALAMAN).toBe(12);
    expect(FOTO_PER_HALAMAN).toBe(24);
  });

  it('menyusun tautan album dan foto dengan aturan yang sama', () => {
    expect(tautanAlbum(1)).toEqual({});
    expect(tautanAlbum(2)).toEqual({ page: '2' });
    expect(tautanFoto(1)).toEqual({});
    expect(tautanFoto(4)).toEqual({ page: '4' });
  });
});
