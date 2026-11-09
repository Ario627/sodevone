import 'reflect-metadata';
import { Module, type INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureApp } from '../bootstrap.js';
import type { RuntimeEnv } from '../bootstrap.js';
import { ContributorService } from './contributor.service.js';
import { ContributorPublicController } from './contributor.public.controller.js';

const ETAG = '"2026-10-29-02-00-00-00-1"';

const KARTU = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Ario Abdillah Sajad',
  nickname: 'Ario',
  role: 'Perancang & pengembang situs',
  className: 'XI PPLG 1',
  summary: 'Situs ini dikerjakan sendiri dari nol tanpa templat.',
  focuses: [{ title: 'Antarmuka', body: 'Tata letak, kisi, tipografi, dan warna.' }],
  tools: ['Angular', 'NestJS'],
};

const ENV_UJI: RuntimeEnv = {
  nodeEnv: 'test',
  corsOrigins: 'https://kelas.example',
  trustProxyHops: 0,
};

const published = vi.fn();

@Module({
  controllers: [ContributorPublicController],
  providers: [{ provide: ContributorService, useValue: { published } }],
})
class UjiContributorModule {}

let app: INestApplication;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [UjiContributorModule] }).compile();

  app = moduleRef.createNestApplication<NestExpressApplication>();

  configureApp(app as NestExpressApplication, ENV_UJI);
  await app.init();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  published.mockReset().mockResolvedValue({ contributor: KARTU, etag: ETAG });
});

describe('GET /api/public/contributor', () => {
  it('mengembalikan kartu dengan cache publik', async () => {
    const respons = await request(app.getHttpServer()).get('/api/public/contributor').expect(200);

    expect(respons.body).toEqual(KARTU);
    expect(respons.headers['cache-control']).toBe('public, max-age=60, stale-while-revalidate=300');
    expect(respons.headers['etag']).toBe(ETAG);
  });

  it('membalas 304 tanpa badan saat ETag cocok', async () => {
    const respons = await request(app.getHttpServer())
      .get('/api/public/contributor')
      .set('If-None-Match', ETAG)
      .expect(304);

    expect(respons.text).toBe('');
  });

  it('membalas 404 dengan pesan Indonesia saat kartu belum ada', async () => {
    published.mockResolvedValue(null);

    const respons = await request(app.getHttpServer()).get('/api/public/contributor').expect(404);

    expect(respons.body.error.code).toBe('NOT_FOUND');
    expect(respons.body.error.message).toBe('Kartu pembuat belum tersedia.');
  });

  it('tidak memasang cache publik pada balasan galat', async () => {
    published.mockResolvedValue(null);

    const respons = await request(app.getHttpServer()).get('/api/public/contributor').expect(404);

    expect(respons.headers['cache-control']).toBeUndefined();
  });
});
