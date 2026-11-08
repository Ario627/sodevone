import { DASAR_API, type Permintaan } from './dasar';

const SOSIAL = `${DASAR_API}/public/social`;

const MEDIA = `${DASAR_API}/media`;

export const PLATFORM = ['instagram', 'tiktok'] as const;

export type Platform = (typeof PLATFORM)[number];

export interface GambarSosial {
  readonly id: string | null;
  readonly url: string | null;
  readonly width: number;
  readonly height: number;
  readonly altText: string | null;
}

export interface PostinganSosial {
  readonly id: string;
  readonly platform: Platform;
  readonly url: string;
  readonly caption: string | null;
  readonly postedAt: string | null;
  readonly image: GambarSosial;
}

export interface KoleksiSosial {
  readonly items: readonly PostinganSosial[];
}

function objek(nilai: unknown): Record<string, unknown> | null {
  return typeof nilai === 'object' && nilai !== null ? (nilai as Record<string, unknown>) : null;
}

function teks(nilai: unknown): string | null {
  return typeof nilai === 'string' && nilai.trim().length > 0 ? nilai.trim() : null;
}

function angka(nilai: unknown, cadangan: number): number {
  return typeof nilai === 'number' && Number.isFinite(nilai) && nilai > 0 ? nilai : cadangan;
}

function platformDari(nilai: unknown): Platform | null {
  const isi = teks(nilai)?.toLowerCase();

  return isi === 'instagram' || isi === 'tiktok' ? isi : null;
}

export function sumberGambarSosial(gambar: GambarSosial, ukuran: 'kecil' | 'sedang'): string {
  if (gambar.id !== null) {
    return `${MEDIA}/${encodeURIComponent(gambar.id)}?ukuran=${ukuran}`;
  }

  if (gambar.url !== null) {
    return gambar.url;
  }

  return '';
}

export function permintaanSosial(limit: number): Permintaan {
  return { url: SOSIAL, params: { limit: String(limit) } };
}

function bacaSatu(nilai: unknown, indeks: number): PostinganSosial | null {
  const isi = objek(nilai);

  if (isi === null) {
    return null;
  }

  const platform = platformDari(isi['platform']);
  const tautan = teks(isi['url']);

  if (platform === null || tautan === null) {
    return null;
  }

  const gambar = objek(isi['image']) ?? {};
  const id = teks(gambar['id']);
  const urlGambar = teks(gambar['url']);

  if (id === null && urlGambar === null) {
    return null;
  }

  return {
    id: teks(isi['id']) ?? `sosial-${indeks}`,
    platform,
    url: tautan,
    caption: teks(isi['caption']),
    postedAt: teks(isi['postedAt']),
    image: {
      id,
      url: urlGambar,
      width: angka(gambar['width'], 4),
      height: angka(gambar['height'], 5),
      altText: teks(gambar['altText']),
    },
  };
}

export function bacaKoleksiSosial(nilai: unknown): KoleksiSosial {
  const isi = objek(nilai);

  if (isi === null) {
    throw new Error('Balasan media sosial bukan objek.');
  }

  const daftar = Array.isArray(isi['items']) ? isi['items'] : [];

  const items = daftar
    .map((butir, indeks) => bacaSatu(butir, indeks))
    .filter((butir): butir is PostinganSosial => butir !== null);

  return { items };
}