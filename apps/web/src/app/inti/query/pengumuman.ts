import {
  AnnouncementCategorySchema,
  type AnnouncementCategory,
  type AnnouncementListQuery,
} from '@kelas/contracts';

export const PER_HALAMAN = 10;

const HALAMAN_MINIMUM = 1;

const HALAMAN_MAKSIMUM = 1000;

const PANJANG_KATA_KUNCI = 120;

const POLA_HALAMAN = /^[0-9]{1,4}$/;

export function kategoriDari(nilai: string | undefined): AnnouncementCategory | undefined {
  const terbaca = AnnouncementCategorySchema.safeParse(nilai);

  return terbaca.success ? terbaca.data : undefined;
}

export function halamanDari(nilai: string | undefined): number {
  if (nilai === undefined || !POLA_HALAMAN.test(nilai)) {
    return HALAMAN_MINIMUM;
  }

  return Math.min(Math.max(Number.parseInt(nilai, 10), HALAMAN_MINIMUM), HALAMAN_MAKSIMUM);
}

export function kataKunciDari(nilai: string | undefined): string | undefined {
  const bersih = nilai?.trim();

  if (bersih === undefined || bersih.length === 0 || bersih.length > PANJANG_KATA_KUNCI) {
    return undefined;
  }

  return bersih;
}

export function arsipDari(nilai: string | undefined): boolean {
  return nilai === 'true';
}

export function daftarQueryDari(sumber: {
  page?: string;
  kategori?: string;
  q?: string;
  arsip?: string;
}): AnnouncementListQuery {
  return {
    page: halamanDari(sumber.page),
    perPage: PER_HALAMAN,
    kategori: kategoriDari(sumber.kategori),
    q: kataKunciDari(sumber.q),
    arsip: arsipDari(sumber.arsip),
  };
}

export function tautanDaftar(
  query: AnnouncementListQuery,
  halaman: number,
): Record<string, string> {
  const parameter: Record<string, string> = {};

  if (halaman > HALAMAN_MINIMUM) {
    parameter['page'] = String(halaman);
  }

  if (query.kategori !== undefined) {
    parameter['kategori'] = query.kategori;
  }

  if (query.q !== undefined) {
    parameter['q'] = query.q;
  }

  if (query.arsip) {
    parameter['arsip'] = 'true';
  }

  return parameter;
}

export function adaFilter(query: AnnouncementListQuery): boolean {
  return query.kategori !== undefined || query.q !== undefined || query.arsip;
}