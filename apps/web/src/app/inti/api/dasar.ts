import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorSchema, type ApiErrorCode } from '@kelas/contracts';

export const DASAR_API = '/api';

export type ApiFailure = {
  status: number;
  code: ApiErrorCode;
  message: string;
  correlationId?: string;
  missing: boolean;
};

export type Permintaan = {
  url: string;
  params?: Record<string, string>;
};

const PESAN_CADANGAN = 'Permintaan belum bisa diselesaikan. Coba lagi sebentar lagi.';

const PESAN_STATUS: Record<number, string> = {
  0: 'Tidak ada koneksi ke server. Periksa jaringan lalu coba lagi.',
  403: 'Halaman ini tidak tersedia untuk Anda.',
  404: 'Yang Anda cari tidak ditemukan.',
  429: 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.',
  503: 'Layanan sedang tidak tersedia. Coba lagi beberapa saat lagi.',
};

const KODE_STATUS: Record<number, ApiErrorCode> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  429: 'RATE_LIMITED',
  503: 'SERVICE_UNAVAILABLE',
};

function kodeUntuk(status: number): ApiErrorCode {
  return KODE_STATUS[status] ?? 'INTERNAL_ERROR';
}

function pesanUntuk(status: number): string {
  return PESAN_STATUS[status] ?? PESAN_CADANGAN;
}

export function toApiFailure(error: unknown): ApiFailure {
  if (!(error instanceof HttpErrorResponse)) {
    return { status: 0, code: 'INTERNAL_ERROR', message: PESAN_CADANGAN, missing: false };
  }

  const terbaca = ApiErrorSchema.safeParse(error.error);

  if (terbaca.success) {
    return {
      status: error.status,
      code: terbaca.data.error.code,
      message: terbaca.data.error.message,
      correlationId: terbaca.data.error.correlationId,
      missing: terbaca.data.error.code === 'NOT_FOUND',
    };
  }

  return {
    status: error.status,
    code: kodeUntuk(error.status),
    message: pesanUntuk(error.status),
    missing: error.status === 404,
  };
}

export function parameterDari(
  nilai: Record<string, string | number | boolean | undefined>,
): Record<string, string> | undefined {
  const terisi = Object.entries(nilai).filter(([, isi]) => isi !== undefined);

  if (terisi.length === 0) {
    return undefined;
  }

  return Object.fromEntries(terisi.map(([kunci, isi]) => [kunci, String(isi)]));
}