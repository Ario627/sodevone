import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../../config/env.js';
import { corsOrigins } from '../../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const CROSS_SITE_FORMABLE_TYPES = new Set([
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
]);

const TYPE_SEPARATOR = ';';

const CROSS_SITE_FORBIDDEN_MESSAGE = 'Permintaan dari situs lain ditolak.';

const FORM_FORBIDDEN_MESSAGE = 'Permintaan tulis harus dikirim sebagai JSON, bukan formulir.';

export function isSafeMethod(method: string): boolean {
  return SAFE_METHODS.has(method.toUpperCase());
}

export function mediaTypeOf(header: string | undefined): string | undefined {
  return typeof header === 'string'
    ? header.split(TYPE_SEPARATOR)[0]?.trim().toLowerCase()
    : undefined;
}

export function isCrossSiteFormable(mediaType: string | undefined): boolean {
  return mediaType !== undefined && CROSS_SITE_FORMABLE_TYPES.has(mediaType);
}

function forbidden(message: string): ForbiddenException {
  return new ForbiddenException({ code: 'FORBIDDEN', message });
}

@Injectable()
export class OriginGuard implements CanActivate {
  private readonly allowed: string[];

  constructor(config: ConfigService<Env, true>) {
    this.allowed = corsOrigins(config.get('CORS_ORIGINS', { infer: true }));
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (isSafeMethod(request.method)) {
      return true;
    }

    if (request.headers['sec-fetch-site'] === 'cross-site') {
      throw forbidden(CROSS_SITE_FORBIDDEN_MESSAGE);
    }

    const origin = request.headers.origin;

    if (typeof origin === 'string' && origin.length > 0) {
      if (!this.allowed.includes(origin)) {
        throw forbidden(CROSS_SITE_FORBIDDEN_MESSAGE);
      }

      return true;
    }

    if (isCrossSiteFormable(mediaTypeOf(request.headers['content-type']))) {
      throw forbidden(FORM_FORBIDDEN_MESSAGE);
    }

    return true;
  }
}
