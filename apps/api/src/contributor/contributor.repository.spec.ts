import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { DatabaseService } from '../db/database.service.js';
import { migrationBodies } from '../db/migration-catalog.js';
import * as schema from '../db/schema/index.js';
import { ContributorRepository, PRIMARY_CONTRIBUTOR_ID } from './contributor.repository.js';

const DATABASE_URL = process.env['DATABASE_URL'];

const ROLLBACK: unique symbol = Symbol('rollback');

const SKEMA = `test_${randomBytes(6).toString('hex')}`;

type Klien = ReturnType<typeof postgres>;

type Database = PostgresJsDatabase<typeof schema>;

let admin: Klien;

let client: Klien;

let root: Database;

function repositoryOf(db: Database): ContributorRepository {
  return new ContributorRepository({ db } as unknown as DatabaseService);
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

const NILAI = {
  id: PRIMARY_CONTRIBUTOR_ID,
  name: 'Ario Abdillah Sajad',
  nickname: 'Ario',
  role: 'Perancang & pengembang situs',
  className: 'XI PPLG 1',
  summary: 'Situs ini dikerjakan sendiri dari nol tanpa templat.',
  focuses: [{ title: 'Antarmuka', body: 'Tata letak, kisi, tipografi, dan warna.' }],
  tools: ['Angular', 'NestJS'],
  isPublished: true,
};

describe.skipIf(DATABASE_URL === undefined)('ContributorRepository dengan basis data nyata', () => {
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

    for (const body of await migrationBodies()) {
      await client.unsafe(body).simple();
    }
  });

  afterAll(async () => {
    await client.end({ timeout: 5 });
    await admin.unsafe(`drop schema if exists ${SKEMA} cascade`);
    await admin.end({ timeout: 5 });
  });

  it('belum menemukan kartu pada tabel kosong', async () => {
    await expect(repositoryOf(root).findById(PRIMARY_CONTRIBUTOR_ID)).resolves.toBeUndefined();
  });

  it('menyimpan kartu baru lengkap dengan larik jsonb', async () => {
    await dalamTransaksi(async (db) => {
      await repositoryOf(db).upsert(db, NILAI);

      const hasil = await repositoryOf(db).findById(PRIMARY_CONTRIBUTOR_ID);

      expect(hasil?.focuses).toEqual(NILAI.focuses);
      expect(hasil?.tools).toEqual(NILAI.tools);
    });
  });

  it('memperbarui baris yang sama tanpa menambah baris kedua', async () => {
    await dalamTransaksi(async (db) => {
      await repositoryOf(db).upsert(db, NILAI);
      await repositoryOf(db).upsert(db, { ...NILAI, nickname: 'Rio' });

      const hasil = await repositoryOf(db).findById(PRIMARY_CONTRIBUTOR_ID);

      expect(hasil?.nickname).toBe('Rio');
    });
  });

  it('menyimpan larik kosong sebagai jsonb array', async () => {
    await dalamTransaksi(async (db) => {
      await repositoryOf(db).upsert(db, { ...NILAI, focuses: [], tools: [] });

      const hasil = await repositoryOf(db).findById(PRIMARY_CONTRIBUTOR_ID);

      expect(hasil?.focuses).toEqual([]);
      expect(hasil?.tools).toEqual([]);
    });
  });

  it('mengganti larik lama sepenuhnya saat menyimpan ulang', async () => {
    await dalamTransaksi(async (db) => {
      await repositoryOf(db).upsert(db, NILAI);
      await repositoryOf(db).upsert(db, { ...NILAI, tools: ['Svelte'] });

      const hasil = await repositoryOf(db).findById(PRIMARY_CONTRIBUTOR_ID);

      expect(hasil?.tools).toEqual(['Svelte']);
    });
  });

  it('menolak ringkasan yang terlalu pendek', async () => {
    await dalamTransaksi(async (db) => {
      await expect(repositoryOf(db).upsert(db, { ...NILAI, summary: 'pendek' })).rejects.toThrow();
    });
  });
});
