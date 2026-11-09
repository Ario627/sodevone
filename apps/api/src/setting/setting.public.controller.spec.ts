import 'reflect-metadata';
import { Module, type INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureApp } from '../bootstrap.js';
import type { RuntimeEnv } from '../bootstrap.js';
import { SiteSettingService } from './site-setting.service.js';
import { SettingPublicController } from './setting.public.controller.js';

const ETAG = '"2026-11-09-02-00-00-00-1"';

const PENGATURAN = {
  voxelBoard: { kind: 'teks', teks: 'XI', warna: 'sinyal' },
  updatedAt: '2026-11-09T02:00:00.000Z',
};

const ENV_UJI: RuntimeEnv = {
  nodeEnv: 'test',
  corsOrigins: 'https://kelas.example',
  trustProxyHops: 0,
};

const publicSettings = vi.fn();

@Module({
  controllers: [SettingPublicController],
  providers: [{ provide: SiteSettingService, useValue: { publicSettings } }],
})
class UjiSettingModule {}

let app: INestApplication;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [UjiSettingModule] }).compile();

  app = moduleRef.createNestApplication<NestExpressApplication>();

  configureApp(app as NestExpressApplication, ENV_UJI);
  await app.init();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  publicSettings.mockReset().mockResolvedValue({ settings: PENGATURAN, etag: ETAG });
});

describe('GET /api/public/settings', () => {
  it('mengembalikan pengaturan dengan cache publik', async () => {
    const respons = await request(app.getHttpServer()).get('/api/public/settings').expect(200);

    expect(respons.body).toEqual(PENGATURAN);
    expect(respons.headers['cache-control']).toBe('public, max-age=60, stale-while-revalidate=300');
    expect(respons.headers['etag']).toBe(ETAG);
    expect(respons.headers['vary']).toBe('Accept-Encoding');
  });

  it('membalas 304 tanpa badan saat ETag cocok', async () => {
    const respons = await request(app.getHttpServer())
      .get('/api/public/settings')
      .set('If-None-Match', ETAG)
      .expect(304);

    expect(respons.text).toBe('');
  });

  it('membalas 200 saat ETag berbeda', async () => {
    await request(app.getHttpServer())
      .get('/api/public/settings')
      .set('If-None-Match', '"lain-0"')
      .expect(200);
  });

  it('tidak memasang header noindex pada halaman publik', async () => {
    const respons = await request(app.getHttpServer()).get('/api/public/settings').expect(200);

    expect(respons.headers['x-robots-tag']).toBeUndefined();
  });
});
