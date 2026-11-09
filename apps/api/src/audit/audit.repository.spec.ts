import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { DatabaseService } from '../db/database.service.js';
import { migrationBodies } from '../db/migration-catalog.js';
import * as schema from '../db/schema/index.js';
import { adminUser } from '../db/schema/admin-user.js';
import { auditLog } from '../db/schema/audit-log.js';
import { AuditRepository } from './audit.repository.js';

const DATABASE_URL = process.env['DATABASE_URL'];

const ROLLBACK: unique symbol = Symbol('rollback');

const AUTHOR_HASH = '$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA';

const SKEMA = `test_${randomBytes(6).toString('hex')}`;

const ACTOR_ID = '11111111-1111-4111-8111-111111111111';

const OTHER_ID = '22222222-2222-4222-8222-222222222222';

const ENTITY_ID = '33333333-3333-4333-8333-333333333333';

type Klien = ReturnType<typeof postgres>;

type Database = PostgresJsDatabase<typeof schema>;

let admin: Klien;

let client: Klien;

let root: Database;

function repositoryOf(db: Database): AuditRepository {
  return new AuditRepository({ db } as unknown as DatabaseService);
}

async function dalamTransaksi(run: (db: Database) => Promise<void>): Promise<void> {
  try {
    await root.transaction(async (tx) => {
      await run(tx as unknown as Database);
      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) {
      throw error;
    }
  }
}

async function jalankanMigrasi(): Promise<void> {
  for (const body of await migrationBodies()) {
    await client.unsafe(body).simple();
  }
}

async function siapkanData(db: Database): Promise<void> {
  await db.insert(adminUser).values([
    {
      id: ACTOR_ID,
      username: 'budi',
      displayName: 'Budi Santoso',
      passwordHash: AUTHOR_HASH,
      role: 'admin',
    },
    {
      id: OTHER_ID,
      username: 'sari',
      displayName: 'Sari Editor',
      passwordHash: AUTHOR_HASH,
      role: 'editor',
    },
  ]);

  await db.insert(auditLog).values([
    {
      actorId: ACTOR_ID,
      actorLabel: 'budi',
      action: 'create',
      entityType: 'announcement',
      entityId: ENTITY_ID,
      createdAt: '2026-10-30 01:00:00+00',
    },
    {
      actorId: ACTOR_ID,
      actorLabel: 'budi',
      action: 'publish',
      entityType: 'announcement',
      entityId: ENTITY_ID,
      createdAt: '2026-10-31 01:00:00+00',
    },
    {
      actorId: OTHER_ID,
      actorLabel: 'sari',
      action: 'login_success',
      entityType: 'session',
      createdAt: '2026-11-01 01:00:00+00',
    },
  ]);
}

describe.skipIf(DATABASE_URL === undefined)('AuditRepository dengan basis data nyata', () => {
  beforeAll(async () => {
    admin = postgres(DATABASE_URL as string, { max: 1, onnotice: () => undefined });
    await admin.unsafe(`drop schema if exists ${SKEMA} cascade`);
    await admin.unsafe(`create schema ${SKEMA}`);

    client = postgres(DATABASE_URL as string, {
      max: 1,
      onnotice: () => undefined,
      connection: { search_path: SKEMA },
    });
    root = drizzle(client, { schema });

    await jalankanMigrasi();
  });

  afterAll(async () => {
    await client.end({ timeout: 5 });
    await admin.unsafe(`drop schema if exists ${SKEMA} cascade`);
    await admin.end({ timeout: 5 });
  });

  it('mengurutkan entri terbaru lebih dulu', async () => {
    await dalamTransaksi(async (db) => {
      await siapkanData(db);

      const hasil = await repositoryOf(db).findPage({ page: 1, perPage: 10 });

      expect(hasil.total).toBe(3);
      expect(hasil.rows.map((row) => row.action)).toEqual([
        'login_success',
        'publish',
        'create',
      ]);
    });
  });

  it('menyaring berdasarkan aksi dan tipe entitas', async () => {
    await dalamTransaksi(async (db) => {
      await siapkanData(db);
      const repository = repositoryOf(db);

      const publikasi = await repository.findPage({ page: 1, perPage: 10, action: 'publish' });
      const sesi = await repository.findPage({ page: 1, perPage: 10, entityType: 'session' });

      expect(publikasi.rows).toHaveLength(1);
      expect(sesi.rows.map((row) => row.action)).toEqual(['login_success']);
    });
  });

  it('menyaring berdasarkan aktor', async () => {
    await dalamTransaksi(async (db) => {
      await siapkanData(db);

      const hasil = await repositoryOf(db).findPage({
        page: 1,
        perPage: 10,
        actorId: OTHER_ID,
      });

      expect(hasil.rows.map((row) => row.action)).toEqual(['login_success']);
    });
  });

  it('menyaring berdasarkan batas waktu inklusif', async () => {
    await dalamTransaksi(async (db) => {
      await siapkanData(db);
      const repository = repositoryOf(db);

      const oktober = await repository.findPage({
        page: 1,
        perPage: 10,
        from: '2026-10-30T00:00:00.000Z',
        to: '2026-10-31T23:59:59.999Z',
      });

      expect(oktober.total).toBe(2);
      expect(oktober.rows.map((row) => row.action)).toEqual(['publish', 'create']);
    });
  });

  it('menerapkan paginasi dengan total penuh', async () => {
    await dalamTransaksi(async (db) => {
      await siapkanData(db);
      const repository = repositoryOf(db);

      const pertama = await repository.findPage({ page: 1, perPage: 2 });
      const kedua = await repository.findPage({ page: 2, perPage: 2 });

      expect(pertama.rows).toHaveLength(2);
      expect(kedua.rows).toHaveLength(1);
      expect(pertama.total).toBe(3);
      expect(kedua.total).toBe(3);
    });
  });
});
