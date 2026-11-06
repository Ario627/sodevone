import type { ArgumentsHost } from '@nestjs/common';
import {
  BadRequestException,
  HttpException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiExceptionFilter } from './api-exception.filter.js';

type Hasil = {
  status: number;
  body: {
    error: {
      code: string;
      message: string;
      correlationId?: string;
      fields?: Array<{ path: string; message: string }>;
    };
  };
};

function render(exception: unknown, correlationId?: string): Hasil {
  const json = vi.fn();
  const status = vi.fn((_code: number) => ({ json }));
  const request = {
    method: 'GET',
    originalUrl: '/api/admin/announcements',
    headers: correlationId === undefined ? {} : { 'x-correlation-id': correlationId },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  new ApiExceptionFilter().catch(exception, host);

  const code = status.mock.calls[0]?.[0] ?? 0;

  return { status: code, body: json.mock.calls[0]?.[0] as Hasil['body'] };
}

beforeEach(() => {
  vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
});

describe('ApiExceptionFilter', () => {
  it('memetakan 503 menjadi SERVICE_UNAVAILABLE dengan pesan Bahasa Indonesia', () => {
    const hasil = render(new ServiceUnavailableException());

    expect(hasil.status).toBe(503);
    expect(hasil.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(hasil.body.error.message).toBe('Situs sedang diperbarui.');
  });

  it('mempertahankan galat per field dari pipa validasi', () => {
    const hasil = render(
      new BadRequestException({
        code: 'VALIDATION_FAILED',
        fields: [{ path: 'title', message: 'Judul wajib diisi' }],
      }),
    );

    expect(hasil.status).toBe(400);
    expect(hasil.body.error.fields).toEqual([{ path: 'title', message: 'Judul wajib diisi' }]);
    expect(hasil.body.error.message).toBe('Data yang dikirim belum lengkap.');
  });

  it('mengabaikan kode galat yang tidak dikenal kontrak', () => {
    const hasil = render(new BadRequestException({ code: 'DATABASE_SECRET_LEAK' }));

    expect(hasil.body.error.code).toBe('VALIDATION_FAILED');
    expect(hasil.body.error.message).toBe('Data yang dikirim belum lengkap.');
  });

  it('memakai pesan eksplisit yang dikirim sebagai string', () => {
    const hasil = render(new NotFoundException('Pengumuman tidak ditemukan.'));

    expect(hasil.body.error.code).toBe('NOT_FOUND');
    expect(hasil.body.error.message).toBe('Pengumuman tidak ditemukan.');
  });

  it('membuang field dengan bentuk yang tidak sah', () => {
    const hasil = render(
      new BadRequestException({
        code: 'VALIDATION_FAILED',
        fields: [{ path: 'title' }, 'bukan objek', { path: 'body', message: 42 }],
      }),
    );

    expect(hasil.body.error.fields).toBeUndefined();
  });

  it('tidak membocorkan pesan internal pada galat tak terduga', () => {
    const hasil = render(new Error('koneksi database gagal: password=rahasia'));

    expect(hasil.status).toBe(500);
    expect(hasil.body.error.code).toBe('INTERNAL_ERROR');
    expect(hasil.body.error.message).toBe('Terjadi kesalahan pada server.');
    expect(JSON.stringify(hasil.body)).not.toContain('rahasia');
  });

  it('memakai pesan bawaan per status untuk HttpException tanpa pesan', () => {
    const hasil = render(new NotFoundException());

    expect(hasil.body.error.code).toBe('NOT_FOUND');
    expect(hasil.body.error.message).toBe('Data yang dicari tidak ditemukan.');
  });

  it('menyertakan correlation id bila ada di permintaan', () => {
    const hasil = render(new NotFoundException(), '3f9a1c2e-7b41');

    expect(hasil.body.error.correlationId).toBe('3f9a1c2e-7b41');
  });

  it('mengganti pesan batas ukuran bawaan pustaka dengan pesan Bahasa Indonesia', () => {
    const hasil = render(new PayloadTooLargeException('File too large'));

    expect(hasil.status).toBe(413);
    expect(hasil.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(hasil.body.error.message).toBe('Berkas yang dikirim melebihi batas ukuran.');
    expect(JSON.stringify(hasil.body)).not.toContain('File too large');
  });

  it('mengganti pesan batas permintaan bawaan pustaka dengan pesan Bahasa Indonesia', () => {
    const hasil = render(new ThrottlerException());

    expect(hasil.status).toBe(429);
    expect(hasil.body.error.code).toBe('RATE_LIMITED');
    expect(hasil.body.error.message).toBe('Terlalu banyak permintaan. Coba lagi nanti.');
  });

  it('mempertahankan pesan khusus ketika kode galat disertakan sendiri', () => {
    const hasil = render(
      new HttpException(
        { code: 'RATE_LIMITED', message: 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.' },
        429,
      ),
    );

    expect(hasil.body.error.message).toBe(
      'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.',
    );
  });
});
