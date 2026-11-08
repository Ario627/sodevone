import { Controller, Get, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { ThrottlerLimitDetail } from '@nestjs/throttler';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configureApp } from '../../bootstrap.js';
import { ApiThrottlerGuard, retryAfterSecondsOf } from './api-throttler.guard.js';

const LIMIT = 2;

const TTL_MS = 60_000;

function detailOf(overrides: Partial<ThrottlerLimitDetail> = {}): ThrottlerLimitDetail {
  return {
    totalHits: LIMIT + 1,
    timeToExpire: TTL_MS,
    isBlocked: false,
    timeToBlockExpire: 0,
    ttl: TTL_MS,
    limit: LIMIT,
    key: 'kunci',
    tracker: '127.0.0.1',
    ...overrides,
  };
}

describe('retryAfterSecondsOf', () => {
  it('memakai sisa waktu apa adanya karena pembatas sudah menghitung detik', () => {
    expect(retryAfterSecondsOf(detailOf({ timeToExpire: 59 }))).toBe(59);
  });

  it('memakai waktu blokir ketika pembatas memblokir', () => {
    const detail = detailOf({ isBlocked: true, timeToBlockExpire: 30, timeToExpire: 59 });

    expect(retryAfterSecondsOf(detail)).toBe(30);
  });

  it('memakai sisa jendela ketika diblokir tanpa durasi blokir', () => {
    const detail = detailOf({ isBlocked: true, timeToBlockExpire: 0, timeToExpire: 45 });

    expect(retryAfterSecondsOf(detail)).toBe(45);
  });

  it('tidak pernah mengembalikan nol atau angka negatif', () => {
    expect(retryAfterSecondsOf(detailOf({ timeToExpire: 0 }))).toBe(1);
    expect(retryAfterSecondsOf(detailOf({ timeToExpire: -5 }))).toBe(1);
  });

  it('membulatkan sisa waktu pecahan ke atas', () => {
    expect(retryAfterSecondsOf(detailOf({ timeToExpire: 1.2 }))).toBe(2);
  });
});

@Controller('dibatasi')
class LimitedController {
  @Get()
  baca(): { ok: boolean } {
    return { ok: true };
  }
}

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: TTL_MS, limit: LIMIT }])],
  controllers: [LimitedController],
  providers: [{ provide: APP_GUARD, useClass: ApiThrottlerGuard }],
})
class LimitedModule {}

describe('ApiThrottlerGuard pada HTTP', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [LimitedModule] }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
    configureApp(app, { nodeEnv: 'test', corsOrigins: 'https://kelas.example', trustProxyHops: 0 });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('membatasi permintaan dan menyertakan Retry-After serta pesan Indonesia', async () => {
    const server = app.getHttpServer();

    await request(server).get('/dibatasi').expect(200);
    await request(server).get('/dibatasi').expect(200);

    const terbatas = await request(server).get('/dibatasi').expect(429);

    expect(terbatas.headers['retry-after']).toBeDefined();
    expect(Number(terbatas.headers['retry-after'])).toBeGreaterThanOrEqual(1);
    expect(Number(terbatas.headers['retry-after'])).toBeLessThanOrEqual(TTL_MS / 1000);

    const body = terbatas.body as { error: { code: string; message: string } };

    expect(body.error.code).toBe('RATE_LIMITED');
    expect(body.error.message).toBe('Terlalu banyak permintaan. Coba lagi nanti.');
  });
});
