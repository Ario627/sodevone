import { SiteSettingSchema, type SiteSetting, type VoxelBoard } from '@kelas/contracts';
import { DASAR_API, type Permintaan } from './dasar';

const PUBLIK = `${DASAR_API}/public/settings`;

const ADMIN = `${DASAR_API}/admin/settings`;

export const PAPAN_CADANGAN: VoxelBoard = {
  kind: 'teks',
  teks: 'XI',
  warna: 'sinyal',
};

export const TOKEN_WARNA: Record<VoxelBoard['warna'], string> = {
  sinyal: '--color-sinyal',
  tinta: '--color-tinta-700',
  batu: '--color-batu-700',
  hijau: '--color-hijau-600',
};

export function bacaPengaturan(nilai: unknown): SiteSetting {
  return SiteSettingSchema.parse(nilai);
}

export function permintaanPengaturan(): Permintaan {
  return { url: PUBLIK };
}

export function alamatPapanPiksel(): string {
  return `${ADMIN}/voxel-board`;
}

export function papanDari(pengaturan: SiteSetting | undefined): VoxelBoard {
  return pengaturan?.voxelBoard ?? PAPAN_CADANGAN;
}