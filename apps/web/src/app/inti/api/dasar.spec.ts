import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { parameterDari, toApiFailure } from './dasar';

function kegagalanDengan(status: number, body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body });
}

describe('toApiFailure', () => {
  it('memakai envelope galat dari server bila bentuknya sah', () => {
    const kegagalan = toApiFailure(
      kegagalanDengan(404, {
        error: { code: 'NOT_FOUND', message: 'Pengumuman tidak ditemukan.', correlationId: 'abc12345' },
      }),
    );

    expect(kegagalan).toEqual({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Pengumuman tidak ditemukan.',
      correlationId: 'abc12345',
      missing: true,
    });
  });

  it('menurunkan kode dari status saat body bukan envelope galat', () => {
    const kegagalan = toApiFailure(kegagalanDengan(429, 'Terlalu banyak'));

    expect(kegagalan.code).toBe('RATE_LIMITED');
    expect(kegagalan.missing).toBe(false);
    expect(kegagalan.message.length).toBeGreaterThan(0);
  });

  it('membedakan kegagalan jaringan tanpa status', () => {
    const kegagalan = toApiFailure(kegagalanDengan(0, null));

    expect(kegagalan.status).toBe(0);
    expect(kegagalan.code).toBe('INTERNAL_ERROR');
    expect(kegagalan.message).toContain('koneksi');
  });

  it('tidak membocorkan objek galat yang tidak dikenal', () => {
    const kegagalan = toApiFailure(new Error('boom'));

    expect(kegagalan.status).toBe(0);
    expect(kegagalan.message).not.toContain('boom');
  });
});

describe('parameterDari', () => {
  it('mengembalikan undefined saat semua nilai kosong', () => {
    expect(parameterDari({ page: undefined, q: undefined })).toBeUndefined();
  });

  it('membuang nilai kosong dan menyerialkan sisanya sebagai teks', () => {
    expect(parameterDari({ page: 2, perPage: 10, q: undefined, arsip: true })).toEqual({
      page: '2',
      perPage: '10',
      arsip: 'true',
    });
  });
});
