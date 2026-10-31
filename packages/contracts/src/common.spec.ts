import { describe, expect, it } from 'vitest';
import {
  ApiErrorSchema,
  CorrelationIdSchema,
  HealthResponseSchema,
  IdempotencyKeySchema,
  IsoDateTimeSchema,
  PaginationMetaSchema,
  PublishedStateSchema,
  SlugSchema,
  paginatedSchema,
} from './index.js';
import { z } from 'zod';

const WAKTU = '2026-10-30T07:05:00.000Z';

describe('SlugSchema', () => {
  it('menerima slug huruf kecil dengan tanda hubung tunggal', () => {
    expect(SlugSchema.parse('perubahan-jadwal-ujian-besok')).toBe('perubahan-jadwal-ujian-besok');
    expect(SlugSchema.parse('libur-kegiatan-17-an')).toBe('libur-kegiatan-17-an');
  });

  it('menolak huruf besar, spasi, dan tanda hubung ganda', () => {
    for (const value of ['Perubahan', 'perubahan jadwal', 'perubahan--jadwal', '-awal', 'akhir-']) {
      expect(SlugSchema.safeParse(value).success).toBe(false);
    }
  });

  it('menolak slug melebihi 120 karakter', () => {
    expect(SlugSchema.safeParse('a'.repeat(121)).success).toBe(false);
  });
});

describe('IsoDateTimeSchema', () => {
  it('menerima waktu UTC dengan milidetik', () => {
    expect(IsoDateTimeSchema.safeParse(WAKTU).success).toBe(true);
  });

  it('menolak waktu tanpa zona waktu', () => {
    expect(IsoDateTimeSchema.safeParse('2026-10-30T07:05:00').success).toBe(false);
  });
});

describe('PublishedStateSchema', () => {
  it('tidak pernah menerima status draf pada kontrak publik', () => {
    expect(PublishedStateSchema.safeParse('draft').success).toBe(false);
    expect(PublishedStateSchema.parse('archived')).toBe('archived');
  });
});

describe('CorrelationIdSchema', () => {
  it('menerima karakter aman dengan panjang 8 sampai 64', () => {
    expect(CorrelationIdSchema.safeParse('3f9a1c2e-7b41').success).toBe(true);
  });

  it('menolak nilai kosong, terlalu panjang, dan karakter kendali', () => {
    expect(CorrelationIdSchema.safeParse('pendek').success).toBe(false);
    expect(CorrelationIdSchema.safeParse('a'.repeat(65)).success).toBe(false);
    expect(CorrelationIdSchema.safeParse('3f9a1c2e\nx').success).toBe(false);
    expect(CorrelationIdSchema.safeParse('3f9a1c2e 7b41').success).toBe(false);
  });
});

describe('IdempotencyKeySchema', () => {
  it('menerima kunci bergaya acak', () => {
    expect(IdempotencyKeySchema.safeParse('01JB8Z3K7XQ4M2').success).toBe(true);
  });

  it('menolak kunci terlalu pendek dan berisi spasi', () => {
    expect(IdempotencyKeySchema.safeParse('pendek').success).toBe(false);
    expect(IdempotencyKeySchema.safeParse('kunci dengan spasi').success).toBe(false);
  });
});

describe('PaginationMetaSchema', () => {
  it('menolak nilai negatif dan pecahan', () => {
    expect(
      PaginationMetaSchema.safeParse({ page: 1, perPage: 10, total: -1, totalPages: 0 }).success,
    ).toBe(false);
    expect(
      PaginationMetaSchema.safeParse({ page: 1.5, perPage: 10, total: 0, totalPages: 0 }).success,
    ).toBe(false);
  });
});

describe('paginatedSchema', () => {
  const ItemSchema = z.object({ judul: z.string().min(1) });
  const DaftarSchema = paginatedSchema(ItemSchema);

  it('membungkus daftar bersama meta', () => {
    const parsed = DaftarSchema.parse({
      items: [{ judul: 'Perubahan jadwal' }],
      meta: { page: 1, perPage: 10, total: 1, totalPages: 1 },
    });

    expect(parsed.items).toHaveLength(1);
    expect(parsed.meta.totalPages).toBe(1);
  });

  it('menolak meta yang hilang', () => {
    expect(DaftarSchema.safeParse({ items: [] }).success).toBe(false);
  });
});

describe('ApiErrorSchema', () => {
  it('menerima kode SERVICE_UNAVAILABLE untuk halaman pemeliharaan', () => {
    const parsed = ApiErrorSchema.parse({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Situs sedang diperbarui.' },
    });

    expect(parsed.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('menolak kode di luar daftar', () => {
    expect(
      ApiErrorSchema.safeParse({ error: { code: 'DATABASE_DOWN', message: 'x' } }).success,
    ).toBe(false);
  });

  it('menerima galat per field', () => {
    const parsed = ApiErrorSchema.parse({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Data yang dikirim belum lengkap.',
        correlationId: '3f9a1c2e',
        fields: [{ path: 'title', message: 'Judul wajib diisi' }],
      },
    });

    expect(parsed.error.fields).toEqual([{ path: 'title', message: 'Judul wajib diisi' }]);
  });
});

describe('HealthResponseSchema', () => {
  it('menerima pemeriksaan basis data yang dilewati', () => {
    const parsed = HealthResponseSchema.parse({
      status: 'ok',
      uptimeSeconds: 12,
      version: '0.1.0',
      checks: { database: 'skipped' },
    });

    expect(parsed.checks?.database).toBe('skipped');
  });

  it('menolak uptime negatif', () => {
    expect(
      HealthResponseSchema.safeParse({ status: 'ok', uptimeSeconds: -1, version: '0.1.0' }).success,
    ).toBe(false);
  });
});
