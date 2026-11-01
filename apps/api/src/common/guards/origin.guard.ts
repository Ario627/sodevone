import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../../config/env.js';
import { corsOrigins } from '../../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const CROSS_SITE_FORBIDDEN_MESSAGE = 'Permintaan dari situs lain ditolak.';

@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private allowed(): string[] {
    return corsOrigins(this.config.get('CORS_ORIGINS', { infer: true }));
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(request.method.toUpperCase())) {
      return true;
    }

    if (request.headers['sec-fetch-site'] === 'cross-site') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: CROSS_SITE_FORBIDDEN_MESSAGE,
      });
    }

    const origin = request.headers.origin;

    if (typeof origin !== 'string' || origin.length === 0) {
      return true;
    }

    if (!this.allowed().includes(origin)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: CROSS_SITE_FORBIDDEN_MESSAGE,
      });
    }

    return true;
  }
}