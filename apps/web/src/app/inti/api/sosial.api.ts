import { SocialCollectionSchema, type SocialCollection } from '@kelas/contracts';
import { DASAR_API, parameterDari, type Permintaan } from './dasar';

const SOSIAL = `${DASAR_API}/public/social`;

const MEDIA = `${DASAR_API}/media`;

export const SOSIAL_PER_HALAMAN = 8;

export type PostinganSosial = SocialCollection['items'][number];

export function bacaKoleksiSosial(nilai: unknown): SocialCollection {
  return SocialCollectionSchema.parse(nilai);
}

export function permintaanSosial(limit: number = SOSIAL_PER_HALAMAN): Permintaan {
  return { url: SOSIAL, params: parameterDari({ limit }) };
}

export function sumberGambarSosial(postingan: PostinganSosial, ukuran: 'kecil' | 'sedang'): string {
  const gambar = postingan.image;

  if (gambar.id !== null) {
    return `${MEDIA}/${encodeURIComponent(gambar.id)}?ukuran=${ukuran}`;
  }

  return gambar.url ?? '';
}

export function sumberAplikasi(platform: PostinganSosial['platform']): string {
  return platform === 'instagram'
    ? 'https://www.instagram.com/'
    : 'https://www.tiktok.com/';
}
