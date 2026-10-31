import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { HealthCheckStatus } from '@kelas/contracts';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseService } from '../db/database.service.js';
import { HealthModule } from './health.module.js';

let probeResult: HealthCheckStatus = 'skipped';

const fakeDatabase = { probe: () => Promise.resolve(probeResult) };

describe('HealthController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [HealthModule] })
      .overrideProvider(DatabaseService)
      .useValue(fakeDatabase)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('merespons 200 saat basis data belum dikonfigurasi', async () => {
    probeResult = 'skipped';

    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      version: '0.1.0',
      checks: { database: 'skipped' },
    });
    expect(typeof response.body.uptimeSeconds).toBe('number');
  });

  it('melaporkan ok saat basis data menjawab', async () => {
    probeResult = 'ok';

    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toMatchObject({ status: 'ok', checks: { database: 'ok' } });
  });

  it('tetap 200 tetapi degraded saat basis data gagal', async () => {
    probeResult = 'error';

    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toMatchObject({ status: 'degraded', checks: { database: 'error' } });
  });

  it('menolak lalu lintas lewat /health/ready saat basis data gagal', async () => {
    probeResult = 'error';

    const response = await request(app.getHttpServer()).get('/health/ready').expect(503);

    expect(response.body).toMatchObject({ status: 'degraded', checks: { database: 'error' } });
  });

  it('menerima lalu lintas lewat /health/ready saat basis data sehat', async () => {
    probeResult = 'ok';

    await request(app.getHttpServer()).get('/health/ready').expect(200);
  });

  it('menjawab liveness tanpa menyentuh basis data', async () => {
    probeResult = 'error';

    const response = await request(app.getHttpServer()).get('/health/live').expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });
});
