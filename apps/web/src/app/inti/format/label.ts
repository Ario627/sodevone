import type { AnnouncementCategory } from '@kelas/contracts';

export const KATEGORI_URUT: readonly AnnouncementCategory[] = [
  'akademik',
  'kegiatan',
  'administrasi',
  'umum',
];

const LABEL: Record<AnnouncementCategory, string> = {
  akademik: 'Akademik',
  kegiatan: 'Kegiatan',
  administrasi: 'Administrasi',
  umum: 'Umum',
};

const LEBAR_NOMOR = 3;

export function labelKategori(kategori: AnnouncementCategory): string {
  return LABEL[kategori];
}

export function nomorUrut(nomor: number): string {
  return String(nomor).padStart(LEBAR_NOMOR, '0');
}
