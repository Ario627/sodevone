import 'reflect-metadata';
import { Module, type INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureApp } from '../bootstrap.js';
import type { RuntimeEnv } from '../bootstrap.js';
import { MemberService } from './member.service.js';
import { MemberPublicController } from './member.public.controller.js';

const ETAG = '"2026-10-29-02-00-00-00-1"';

const SATU_ANGGOTA = {
  id: '3f9a1c4e-1111-4222-8333-444455556666',
  order: 1,
  role: 'student' as const,
  fullName: 'Aditya Pranawa',
  nickname: 'Adit',
  hobby: 'menyusun playlist',
  note: 'Kalau ada bug, dia yang pertama bilang coba restart.',
};

const ENV_UJI: RuntimeEnv = {
  nodeEnv: 'test',
  corsOrigins: 'https://kelas.example',
  trustProxyHops: 0,
};

const collection = vi.fn();

@Module({
  controllers: [MemberPublicController],
  providers: [{ provide: MemberService, useValue: { collection } }],
})
class UjiMemberModule {}

let app: INestApplication;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [UjiMemberModule] }).compile();

  app = moduleRef.createNestApplication<NestExpressApplication>();

  configureApp(app as NestExpressApplication, ENV_UJI);
  await app.init();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  collection.mockReset().mockResolvedValue({ items: [SATU_ANGGOTA], etag: ETAG });
});

describe('GET /api/public/members', () => {
  it('mengembalikan daftar anggota dengan cache publik', async () => {
    const respons = await request(app.getHttpServer()).get('/api/public/members').expect(200);

    expect(respons.body).toEqual({ items: [SATU_ANGGOTA] });
    expect(respons.headers['cache-control']).toBe('public, max-age=60, stale-while-revalidate=300');
    expect(respons.headers['etag']).toBe(ETAG);
    expect(respons.headers['vary']).toBe('Accept-Encoding');
  });

  it('membalas 304 tanpa badan saat ETag cocok', async () => {
    const respons = await request(app.getHttpServer())
      .get('/api/public/members')
      .set('If-None-Match', ETAG)
      .expect(304);

    expect(respons.text).toBe('');
  });

  it('membalas 200 saat ETag berbeda', async () => {
    await request(app.getHttpServer())
      .get('/api/public/members')
      .set('If-None-Match', '"lain-0"')
      .expect(200);
  });

  it('mengabaikan parameter kueri tambahan karena daftar tidak berpaginasi', async () => {
    await request(app.getHttpServer()).get('/api/public/members?limit=8').expect(200);

    expect(collection).toHaveBeenCalledTimes(1);
  });

  it('mengembalikan daftar kosong tanpa gagal', async () => {
    collection.mockResolvedValue({ items: [], etag: '"kosong-0"' });

    const respons = await request(app.getHttpServer()).get('/api/public/members').expect(200);

    expect(respons.body).toEqual({ items: [] });
  });

  it('tidak mengirim header noindex untuk halaman publik', async () => {
    const respons = await request(app.getHttpServer()).get('/api/public/members').expect(200);

    expect(respons.headers['x-robots-tag']).toBeUndefined();
  });
});
