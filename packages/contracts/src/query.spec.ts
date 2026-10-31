import { describe, expect, it } from 'vitest';
import {
  AnnouncementListQuerySchema,
  BooleanQuerySchema,
  PageParamSchema,
  PerPagePublicSchema,
  SearchQuerySchema,
} from './index.js';

describe('PageParamSchema', () => {
  it('memakai halaman 1 bila parameter tidak dikirim', () => {
    expect(PageParamSchema.parse(undefined)).toBe(1);
  });

  it('menormalkan nilai tidak terbaca menjadi halaman 1', () => {
    for (const value of ['abc', '0', '-3', '', '1e3', '2.5', ' 2 ']) {
      expect(PageParamSchema.parse(value)).toBe(1);
    }
  });

  it('membatasi halaman pada rentang 1 sampai 1000', () => {
    expect(PageParamSchema.parse('7')).toBe(7);
    expect(PageParamSchema.parse('9999')).toBe(1000);
  });

  it('menolak parameter ganda menjadi halaman 1 tanpa galat', () => {
    expect(PageParamSchema.parse(['2', '9'])).toBe(1);
  });
});

describe('PerPagePublicSchema', () => {
  it('memakai nilai bawaan 10', () => {
    expect(PerPagePublicSchema.parse(undefined)).toBe(10);
  });

  it('menolak nilai di luar rentang 1 sampai 50', () => {
    expect(PerPagePublicSchema.safeParse('0').success).toBe(false);
    expect(PerPagePublicSchema.safeParse('51').success).toBe(false);
    expect(PerPagePublicSchema.safeParse('abc').success).toBe(false);
    expect(PerPagePublicSchema.safeParse('50').success).toBe(true);
  });
});

describe('BooleanQuerySchema', () => {
  it('membaca "false" sebagai false, bukan true', () => {
    expect(BooleanQuerySchema.parse('false')).toBe(false);
    expect(BooleanQuerySchema.parse('0')).toBe(false);
    expect(BooleanQuerySchema.parse('true')).toBe(true);
    expect(BooleanQuerySchema.parse('1')).toBe(true);
  });

  it('menolak nilai yang bukan boolean yang dikenal', () => {
    expect(BooleanQuerySchema.safeParse('ya').success).toBe(false);
    expect(BooleanQuerySchema.safeParse('').success).toBe(false);
  });
});

describe('SearchQuerySchema', () => {
  it('memangkas spasi di ujung', () => {
    expect(SearchQuerySchema.parse('  jadwal ujian  ')).toBe('jadwal ujian');
  });

  it('menolak kata kunci terlalu panjang dan karakter kendali', () => {
    expect(SearchQuerySchema.safeParse('a'.repeat(121)).success).toBe(false);
    expect(SearchQuerySchema.safeParse('jadwal\nujian').success).toBe(false);
  });
});

describe('AnnouncementListQuerySchema', () => {
  it('memakai nilai bawaan lengkap saat query kosong', () => {
    expect(AnnouncementListQuerySchema.parse({})).toEqual({
      page: 1,
      perPage: 10,
      arsip: false,
    });
  });

  it('membaca arsip=false sebagai false', () => {
    const parsed = AnnouncementListQuerySchema.parse({ arsip: 'false' });

    expect(parsed.arsip).toBe(false);
  });

  it('mengabaikan parameter asing agar tautan dari aplikasi chat tetap bekerja', () => {
    const parsed = AnnouncementListQuerySchema.parse({ utm_source: 'whatsapp' });

    expect(parsed).toEqual({ page: 1, perPage: 10, arsip: false });
  });

  it('menerima kombinasi filter yang sah', () => {
    const parsed = AnnouncementListQuerySchema.parse({
      page: '2',
      perPage: '20',
      kategori: 'akademik',
      q: 'ujian',
      arsip: 'true',
    });

    expect(parsed).toEqual({
      page: 2,
      perPage: 20,
      kategori: 'akademik',
      q: 'ujian',
      arsip: true,
    });
  });

  it('menolak kategori di luar daftar', () => {
    expect(AnnouncementListQuerySchema.safeParse({ kategori: 'lainnya' }).success).toBe(false);
  });
});
