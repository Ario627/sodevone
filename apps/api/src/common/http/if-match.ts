import { BadRequestException } from '@nestjs/common';

const VERSION_ETAG = /^(?:W\/)?"?([1-9][0-9]{0,8})"?$/;

const ANY_VERSION = '*';

const INVALID_MESSAGE = 'Header If-Match harus berisi nomor versi data.';

export function etagOf(version: number): string {
  return `"${version}"`;
}

export function expectedVersionOf(header: string | undefined): number | undefined {
  if (header === undefined) {
    return undefined;
  }

  const value = header.trim();

  if (value.length === 0 || value === ANY_VERSION) {
    return undefined;
  }

  const digits = VERSION_ETAG.exec(value)?.[1];

  if (digits === undefined) {
    throw new BadRequestException({ code: 'VALIDATION_FAILED', message: INVALID_MESSAGE });
  }

  return Number.parseInt(digits, 10);
}