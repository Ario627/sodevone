import type { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import type { Env } from '../../config/env.js';
import { OriginGuard, isCrossSiteFormable, isSafeMethod, mediaTypeOf } from './origin.guard.js';

const ALLOWED_ORIGIN = 'https://kelas.example';

function guardOf(origins = ALLOWED_ORIGIN): OriginGuard {
  const config = {
    get: () => origins,
  } as unknown as ConfigService<Env, true>;

  return new OriginGuard(config);
}

function contextOf(request: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function requestOf(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    method: 'POST',
    headers: {},
    ...overrides,
  };
}

describe('isSafeMethod', () => {
  it('menganggap GET, HEAD, dan OPTIONS aman', () => {
    expect(isSafeMethod('GET')).toBe(true);
    expect(isSafeMethod('head')).toBe(true);
    expect(isSafeMethod('OPTIONS')).toBe(true);
  });

  it('menganggap POST, PATCH, dan DELETE tidak aman', () => {
    expect(isSafeMethod('POST')).toBe(false);
    expect(isSafeMethod('patch')).toBe(false);
    expect(isSafeMethod('DELETE')).toBe(false);
  });
});

describe('mediaTypeOf', () => {
  it('membuang parameter charset dan menormalkan huruf', () => {
    expect(mediaTypeOf('Application/JSON; charset=utf-8')).toBe('application/json');
  });

  it('mengembalikan undefined untuk header yang tidak ada', () => {
    expect(mediaTypeOf(undefined)).toBeUndefined();
  });
});

describe('isCrossSiteFormable', () => {
  it('menandai tipe yang dapat dikirim formulir lintas situs', () => {
    expect(isCrossSiteFormable('application/x-www-form-urlencoded')).toBe(true);
    expect(isCrossSiteFormable('multipart/form-data')).toBe(true);
    expect(isCrossSiteFormable('text/plain')).toBe(true);
  });

  it('tidak menandai JSON yang butuh preflight', () => {
    expect(isCrossSiteFormable('application/json')).toBe(false);
  });

  it('tidak menandai permintaan tanpa tipe', () => {
    expect(isCrossSiteFormable(undefined)).toBe(false);
  });
});

describe('OriginGuard', () => {
  it('meloloskan metode aman tanpa memeriksa header', () => {
    const guard = guardOf();
    const context = contextOf(requestOf({ method: 'GET', headers: { origin: 'https://jahat.test' } }));

    expect(guard.canActivate(context)).toBe(true);
  });

  it('meloloskan operasi tulis dari origin yang diizinkan', () => {
    const guard = guardOf();
    const context = contextOf(requestOf({ headers: { origin: ALLOWED_ORIGIN } }));

    expect(guard.canActivate(context)).toBe(true);
  });

  it('menolak operasi tulis dari origin asing', () => {
    const guard = guardOf();
    const context = contextOf(requestOf({ headers: { origin: 'https://jahat.test' } }));

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('menolak permintaan yang ditandai lintas situs oleh peramban', () => {
    const guard = guardOf();
    const context = contextOf(
      requestOf({ headers: { origin: ALLOWED_ORIGIN, 'sec-fetch-site': 'cross-site' } }),
    );

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('menolak formulir tanpa header Origin karena formulir lintas situs dapat memakainya', () => {
    const guard = guardOf();
    const context = contextOf(
      requestOf({ headers: { 'content-type': 'application/x-www-form-urlencoded' } }),
    );

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('meloloskan JSON tanpa header Origin agar klien non-peramban tetap berfungsi', () => {
    const guard = guardOf();
    const context = contextOf(requestOf({ headers: { 'content-type': 'application/json' } }));

    expect(guard.canActivate(context)).toBe(true);
  });

  it('meloloskan permintaan tanpa body dan tanpa Origin', () => {
    const guard = guardOf();
    const context = contextOf(requestOf({ headers: {} }));

    expect(guard.canActivate(context)).toBe(true);
  });
});
