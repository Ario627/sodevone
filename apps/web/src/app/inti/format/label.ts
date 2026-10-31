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

export function labelKategori(kategori: AnnouncementCategory): string {
  return LABEL[kategori];
}