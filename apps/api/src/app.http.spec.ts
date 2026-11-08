import 'reflect-metadata';
import {
  Body,
  Controller,
  Get,
  Module,
  Post,
  Req,
  UseGuards,
  type INestApplication,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SESSION_COOKIE_NAME, readSessionToken } from './auth/session-cookie.js';
import { configureApp } from './bootstrap.js';
import type { RuntimeEnv } from './bootstrap.js';
import { PUBLIC_READ_CACHE } from './common/http/cache-control.js';
import { OriginGuard } from './common/guards/origin.guard.js';

const ALLOWED_ORIGIN = 'https://kelas.example';

const CORRELATION_HEADER = 'x-correlation-id';

const CORRELATION_VALUE = '3f9a1c2e-7b41';

const COOKIE_VALUE = 'token-uji-yang-panjang';

const OVERSIZE_BYTES = 120 * 1024;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

@Controller('uji')
class ProbeController {
  @Get('cookie')
  cookie(@Req() req: Request): { token: string | null } {
    return { token: readSessionToken(req) ?? null };
  }

  @Get('echo')
  echo(): { ok: boolean } {
    return { ok: true };
  }

  @Post('json')
  json(@Body() body: { nama?: string }): { nama: string } {
    return { nama: body.nama ?? 'kosong' };
  }

  @Get('gagal')
  gagal(): never {
    throw new Error('kegagalan internal dengan detail rahasia');
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

@Controller('terjaga')
@UseGuards(OriginGuard)
class GuardedController {
  @Post('tulis')
  tulis(): { ok: boolean } {
    return { ok: true };
  }

  @Get('baca')
  baca(): { ok: boolean } {
    return { ok: true };
  }
}

@Module({
  controllers: [GuardedController],
  providers: [
    {
      provide: ConfigService,
      useValue: { get: () => ALLOWED_ORIGIN },
    },
    OriginGuard,
  ],
})
class GuardedModule {}

function runtimeEnvOf(nodeEnv: RuntimeEnv['nodeEnv'] = 'test'): RuntimeEnv {
  return { nodeEnv, corsOrigins: ALLOWED_ORIGIN, trustProxyHops: 0 };
}

async function appOf(
  moduleRefClass: typeof ProbeModule | typeof GuardedModule,
  env: RuntimeEnv = runtimeEnvOf(),
): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [moduleRefClass] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });

  configureApp(app, env);
  await app.init();

  return app;
}

function errorOf(response: request.Response): Record<string, unknown> {
  return (response.body as Record<string, unknown>)['error'] as Record<string, unknown>;
}

describe('bootstrap pada respons biasa', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await appOf(ProbeModule);
  });

  afterAll(async () => {
    await app.close();
  });

  it('membaca cookie sesi karena cookie-parser terpasang', async () => {
    const response = await request(app.getHttpServer())
      .get('/uji/cookie')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${COOKIE_VALUE}`)
      .expect(200);

    expect((response.body as Record<string, unknown>)['token']).toBe(COOKIE_VALUE);
  });

  it('mengembalikan null ketika cookie sesi tidak ada', async () => {
    const response = await request(app.getHttpServer()).get('/uji/cookie').expect(200);

    expect((response.body as Record<string, unknown>)['token']).toBeNull();
  });

  it('membuat correlation id acak ketika klien tidak mengirimnya', async () => {
    const response = await request(app.getHttpServer()).get('/uji/echo').expect(200);

    expect(String(response.headers[CORRELATION_HEADER])).toMatch(UUID_PATTERN);
  });

  it('meneruskan correlation id yang sah dari klien', async () => {
    const response = await request(app.getHttpServer())
      .get('/uji/echo')
      .set(CORRELATION_HEADER, CORRELATION_VALUE)
      .expect(200);

    expect(response.headers[CORRELATION_HEADER]).toBe(CORRELATION_VALUE);
  });

  it('mengganti correlation id yang tidak sah', async () => {
    const response = await request(app.getHttpServer())
      .get('/uji/echo')
      .set(CORRELATION_HEADER, '<script>alert(1)</script>')
      .expect(200);

    expect(String(response.headers[CORRELATION_HEADER])).toMatch(UUID_PATTERN);
  });

  it('tidak mengirim x-powered-by', async () => {
    const response = await request(app.getHttpServer()).get('/uji/echo').expect(200);

    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('memasang header keamanan dasar', async () => {
    const response = await request(app.getHttpServer()).get('/uji/echo').expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['cross-origin-resource-policy']).toBe('same-site');
  });

  it('tidak memasang HSTS di luar produksi', async () => {
    const response = await request(app.getHttpServer()).get('/uji/echo').expect(200);

    expect(response.headers['strict-transport-security']).toBeUndefined();
  });

  it('menolak body JSON yang melewati batas ukuran dengan pesan Indonesia', async () => {
    const response = await request(app.getHttpServer())
      .post('/uji/json')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ nama: 'x'.repeat(OVERSIZE_BYTES) }));

    expect(response.status).toBe(413);
    expect(errorOf(response)['code']).toBe('PAYLOAD_TOO_LARGE');
    expect(String(errorOf(response)['message'])).toBe('Berkas yang dikirim melebihi batas ukuran.');
  });

  it('menerima body JSON di bawah batas', async () => {
    const response = await request(app.getHttpServer())
      .post('/uji/json')
      .set('Content-Type', 'application/json')
      .send({ nama: 'kelas' })
      .expect(201);

    expect((response.body as Record<string, unknown>)['nama']).toBe('kelas');
  });

  it('menyembunyikan detail kegagalan internal', async () => {
    const response = await request(app.getHttpServer()).get('/uji/gagal').expect(500);

    expect(errorOf(response)['code']).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('rahasia');
  });

  it('menyertakan correlation id di dalam envelope galat', async () => {
    const response = await request(app.getHttpServer())
      .get('/uji/gagal')
      .set(CORRELATION_HEADER, CORRELATION_VALUE)
      .expect(500);

    expect(errorOf(response)['correlationId']).toBe(CORRELATION_VALUE);
  });

  it('tidak mengirim Access-Control-Allow-Origin untuk origin asing', async () => {
    const response = await request(app.getHttpServer())
      .get('/uji/echo')
      .set('Origin', 'https://jahat.example')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('mengizinkan origin terdaftar beserta credentials', async () => {
    const response = await request(app.getHttpServer())
      .get('/uji/echo')
      .set('Origin', ALLOWED_ORIGIN)
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('hanya mengizinkan metode tulis yang didukung pada preflight', async () => {
    const response = await request(app.getHttpServer())
      .options('/uji/json')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'POST');

    const methods = String(response.headers['access-control-allow-methods']);

    expect(methods).toContain('POST');
    expect(methods).not.toContain('PUT');
  });
});

describe('bootstrap pada lingkungan produksi', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await appOf(ProbeModule, runtimeEnvOf('production'));
  });

  afterAll(async () => {
    await app.close();
  });

  it('memasang HSTS dengan includeSubDomains', async () => {
    const response = await request(app.getHttpServer()).get('/uji/echo').expect(200);

    expect(String(response.headers['strict-transport-security'])).toContain('includeSubDomains');
  });

  it('tidak menyajikan dokumentasi API', async () => {
    await request(app.getHttpServer()).get('/docs').expect(404);
  });
});

describe('bootstrap dengan OriginGuard', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await appOf(GuardedModule);
  });

  afterAll(async () => {
    await app.close();
  });

  it('meloloskan baca tanpa header Origin', async () => {
    await request(app.getHttpServer()).get('/terjaga/baca').expect(200);
  });

  it('menolak tulis dari origin asing', async () => {
    const response = await request(app.getHttpServer())
      .post('/terjaga/tulis')
      .set('Origin', 'https://jahat.example')
      .expect(403);

    expect(errorOf(response)['code']).toBe('FORBIDDEN');
  });

  it('menolak tulis formulir tanpa header Origin', async () => {
    const response = await request(app.getHttpServer())
      .post('/terjaga/tulis')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('a=1')
      .expect(403);

    expect(errorOf(response)['code']).toBe('FORBIDDEN');
  });

  it('meloloskan tulis JSON tanpa header Origin', async () => {
    await request(app.getHttpServer())
      .post('/terjaga/tulis')
      .set('Content-Type', 'application/json')
      .send({ a: 1 })
      .expect(201);
  });
});

describe('cache baca publik', () => {
  it('menyatakan max-age dan stale-while-revalidate', () => {
    expect(PUBLIC_READ_CACHE).toContain('max-age=');
    expect(PUBLIC_READ_CACHE).toContain('stale-while-revalidate=');
  });
});
