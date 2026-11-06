import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiErrorCodeSchema, type ApiErrorCode } from '@kelas/contracts';
import type { Request, Response } from 'express';

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
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

const STATUS_MESSAGE: Record<number, string> = {
  400: 'Data yang dikirim belum lengkap.',
  401: 'Sesi tidak ditemukan. Silakan masuk kembali.',
  403: 'Anda tidak punya akses ke bagian ini.',
  404: 'Data yang dicari tidak ditemukan.',
  409: 'Permintaan berbenturan dengan data yang sudah ada.',
  413: 'Berkas yang dikirim melebihi batas ukuran.',
  415: 'Jenis berkas tidak didukung.',
  429: 'Terlalu banyak permintaan. Coba lagi nanti.',
  500: 'Terjadi kesalahan pada server.',
  503: 'Situs sedang diperbarui.',
};

const FALLBACK_MESSAGE = 'Terjadi kesalahan pada server';

const TRANSPORT_STATUSES = new Set([413, 429]);

function defaultPhraseOf(status: number): string {
  const name = HttpStatus[status];

  if (typeof name !== 'string') {
    return '';
  }

  return name
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

type ErrorPayload = {
  code?: ApiErrorCode;
  message: string;
  fields?: Array<{ path: string; message: string }>;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  private static codeOf(value: unknown): ApiErrorCode | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const parsed = ApiErrorCodeSchema.safeParse(value);

    return parsed.success ? parsed.data : undefined;
  }

  private static fieldsOf(value: unknown): Array<{ path: string; message: string }> | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const entries = value.flatMap((entry) => {
      if (typeof entry !== 'object' || entry === null) {
        return [];
      }

      const record = entry as Record<string, unknown>;
      const path = typeof record['path'] === 'string' ? record['path'] : undefined;
      const message = typeof record['message'] === 'string' ? record['message'] : undefined;

      return path !== undefined && message !== undefined ? [{ path, message }] : [];
    });

    return entries.length > 0 ? entries : undefined;
  }

  private static messageOf(
    code: ApiErrorCode | undefined,
    supplied: string | undefined,
    status: number,
    fallback: string,
  ): string {
    if (code !== undefined) {
      return supplied ?? fallback;
    }

    if (
      TRANSPORT_STATUSES.has(status) ||
      supplied === undefined ||
      supplied === defaultPhraseOf(status)
    ) {
      return fallback;
    }

    return supplied;
  }

  private static payloadOf(exception: unknown, status: number): ErrorPayload {
    const fallback = STATUS_MESSAGE[status] ?? FALLBACK_MESSAGE;

    if (!(exception instanceof HttpException)) {
      return { message: fallback };
    }

    const body = exception.getResponse();

    if (typeof body === 'string') {
      return { message: ApiExceptionFilter.messageOf(undefined, body, status, fallback) };
    }

    if (typeof body !== 'object' || body === null) {
      return { message: fallback };
    }

    const record = body as Record<string, unknown>;
    const code = ApiExceptionFilter.codeOf(record['code']);
    const supplied = typeof record['message'] === 'string' ? record['message'] : undefined;
    const fields = ApiExceptionFilter.fieldsOf(record['fields']);
    const message = ApiExceptionFilter.messageOf(code, supplied, status, fallback);

    return {
      ...(code ? { code } : {}),
      message,
      ...(fields ? { fields } : {}),
    };
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const header = request.headers['x-correlation-id'];
    const correlationId = typeof header === 'string' ? header : undefined;

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const payload = ApiExceptionFilter.payloadOf(exception, status);
    const code = payload.code ?? STATUS_TO_CODE[status] ?? 'INTERNAL_ERROR';

    response.status(status).json({
      error: {
        code,
        message: payload.message,
        ...(payload.fields ? { fields: payload.fields } : {}),
        ...(correlationId ? { correlationId } : {}),
      },
    });
  }
}
