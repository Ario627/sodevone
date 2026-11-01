import { halamanDari, halamanTautan } from './halaman';

export const GALERI_PER_HALAMAN = 12;

export const FOTO_PER_HALAMAN = 24;

export const GALERI_PER_HALAMAN_MAKS = 50;

export { halamanDari };

export function tautanAlbum(halaman: number): Record<string, string> {
  return halamanTautan(halaman);
}

export function tautanFoto(halaman: number): Record<string, string> {
  return halamanTautan(halaman);
}