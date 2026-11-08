import 'reflect-metadata';
import { Module, type INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureApp } from '../bootstrap.js';
import type { RuntimeEnv } from '../bootstrap.js';
import { SocialService } from './social.service.js';
import { SocialPublicController } from './social.public.controller.js';

const ETAG = '"2026-10-29T02:00:00.000Z-1"';

const SATU_ITEM = {
  id: '3f9a1c4e-1111-4222-8333-444455556666',
  platform: 'instagram' as const,
  url: 'https://www.instagram.com/p/CxYz/',
  caption: 'Pensi',
  postedAt: '2026-10-29T01:00:00.000Z',
  image: {
    id: '8f14e45f-ceea-467f-a8d3-1b7c1e1d9b21',
    url: null,
    width: 1600,
    height: 1200,
    altText: 'Suasana pensi',
  },
};

const collection = vi.fn();

@Module({
  controllers: [SocialPublicController],
  providers: [{ provide: SocialService, useValue: { collection } }],
})
class UjiSocialModule {}

let app: INestApplication;

const ENV_UJI: RuntimeEnv = { nodeEnv: 'test', corsOrigins: 'https://kelas.example', trustProxyHops: 0 };

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [UjiSocialModule] }).compile();

  app = moduleRef.createNestApplication<NestExpressApplication>();

  configureApp(app as NestExpressApplication, ENV_UJI);
  await app.init();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  collection.mockReset().mockResolvedValue({ items: [SATU_ITEM], etag: ETAG });
});

describe('GET /api/public/social', () => {
  it('mengembalikan daftar tautan dengan cache publik enam puluh detik', async () => {
    const respons = await request(app.getHttpServer()).get('/api/public/social').expect(200);

    expect(respons.body).toEqual({ items: [SATU_ITEM] });
    expect(respons.headers['cache-control']).toBe('public, max-age=60, stale-while-revalidate=300');
    expect(respons.headers['etag']).toBe(ETAG);
  });

  it('memakai batas bawaan delapan saat limit tidak dikirim', async () => {
    await request(app.getHttpServer()).get('/api/public/social').expect(200);

    expect(collection).toHaveBeenCalledWith({ limit: 8 });
  });

  it('meneruskan limit yang diminta', async () => {
    await request(app.getHttpServer()).get('/api/public/social?limit=3').expect(200);

    expect(collection).toHaveBeenCalledWith({ limit: 3 });
  });

  it('menolak limit di luar rentang', async () => {
    await request(app.getHttpServer()).get('/api/public/social?limit=0').expect(400);
    await request(app.getHttpServer()).get('/api/public/social?limit=99').expect(400);
    await request(app.getHttpServer()).get('/api/public/social?limit=abc').expect(400);

    expect(collection).not.toHaveBeenCalled();
  });

  it('menolak parameter kueri yang tidak dikenal', async () => {
    await request(app.getHttpServer()).get('/api/public/social?limit=8&debug=1').expect(400);

    expect(collection).not.toHaveBeenCalled();
  });

  it('membalas 304 tanpa badan saat ETag cocok', async () => {
    const respons = await request(app.getHttpServer())
      .get('/api/public/social')
      .set('If-None-Match', ETAG)
      .expect(304);

    expect(respons.text).toBe('');
  });

  it('membalas 200 saat ETag berbeda', async () => {
    await request(app.getHttpServer())
      .get('/api/public/social')
      .set('If-None-Match', '"lain-0"')
      .expect(200);
  });
});
