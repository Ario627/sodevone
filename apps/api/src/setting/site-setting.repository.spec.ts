import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { DatabaseService } from '../db/database.service.js';
import { migrationBodies } from '../db/migration-catalog.js';
import * as schema from '../db/schema/index.js';
import { adminUser } from '../db/schema/admin-user.js';
import { SiteSettingRepository } from './site-setting.repository.js';

const DATABASE_URL = process.env['DATABASE_URL'];

const ROLLBACK: unique symbol = Symbol('rollback');

const AUTHOR_HASH = '$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA';

const SKEMA = `test_${randomBytes(6).toString('hex')}`;

const KUNCI = 'voxel-board';

type Klien = ReturnType<typeof postgres>;

type Database = PostgresJsDatabase<typeof schema>;

let admin: Klien;

let client: Klien;

let root: Database;

function repositoryOf(db: Database): SiteSettingRepository {
  return new SiteSettingRepository({ db } as unknown as DatabaseService);
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

async function penulisOf(db: Database): Promise<string> {
  const [penulis] = await db
    .insert(adminUser)
    .values({ username: `uji-${Date.now()}`, displayName: 'Uji', passwordHash: AUTHOR_HASH })
    .returning({ id: adminUser.id });

  if (penulis === undefined) {
    throw new Error('Gagal membuat pengguna uji');
  }

  return penulis.id;
}

describe.skipIf(DATABASE_URL === undefined)('SiteSettingRepository dengan basis data nyata', () => {
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

  it('belum menemukan apa pun pada tabel kosong', async () => {
    await expect(repositoryOf(root).find(KUNCI)).resolves.toBeUndefined();
  });

  it('menyimpan dan membaca kembali nilai jsonb', async () => {
    await dalamTransaksi(async (db) => {
      const penulisId = await penulisOf(db);

      await repositoryOf(db).upsert(
        db,
        KUNCI,
        { kind: 'teks', teks: 'XI', warna: 'sinyal' },
        penulisId,
      );

      const hasil = await repositoryOf(db).find(KUNCI);

      expect(hasil?.value).toEqual({ kind: 'teks', teks: 'XI', warna: 'sinyal' });
      expect(hasil?.updatedBy).toBe(penulisId);
    });
  });

  it('menimpa nilai lama tanpa menambah baris', async () => {
    await dalamTransaksi(async (db) => {
      const penulisId = await penulisOf(db);

      await repositoryOf(db).upsert(
        db,
        KUNCI,
        { kind: 'teks', teks: 'XI', warna: 'sinyal' },
        penulisId,
      );
      await repositoryOf(db).upsert(
        db,
        KUNCI,
        { kind: 'teks', teks: 'XII', warna: 'tinta' },
        penulisId,
      );

      const hasil = await repositoryOf(db).find(KUNCI);

      expect(hasil?.value).toEqual({ kind: 'teks', teks: 'XII', warna: 'tinta' });
    });
  });

  it('menyimpan matriks dua dimensi apa adanya', async () => {
    await dalamTransaksi(async (db) => {
      const penulisId = await penulisOf(db);
      const baris = ['10001', '10001', '01010', '00100', '01010', '10001', '10001'];

      await repositoryOf(db).upsert(
        db,
        KUNCI,
        { kind: 'matriks', baris, warna: 'hijau' },
        penulisId,
      );

      const hasil = await repositoryOf(db).find(KUNCI);

      expect(hasil?.value).toEqual({ kind: 'matriks', baris, warna: 'hijau' });
    });
  });

  it('menolak nilai yang bukan objek json', async () => {
    await dalamTransaksi(async (db) => {
      const penulisId = await penulisOf(db);

      await expect(
        repositoryOf(db).upsert(db, KUNCI, ['bukan', 'objek'] as never, penulisId),
      ).rejects.toThrow();
    });
  });

  it('menghapus baris saat dikembalikan ke bawaan', async () => {
    await dalamTransaksi(async (db) => {
      const penulisId = await penulisOf(db);

      await repositoryOf(db).upsert(
        db,
        KUNCI,
        { kind: 'teks', teks: 'XI', warna: 'sinyal' },
        penulisId,
      );
      await repositoryOf(db).remove(db, KUNCI);

      await expect(repositoryOf(db).find(KUNCI)).resolves.toBeUndefined();
    });
  });
});
