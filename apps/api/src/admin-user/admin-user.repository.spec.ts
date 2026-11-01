import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { DatabaseService } from '../db/database.service.js';
import * as schema from '../db/schema/index.js';
import { adminUser } from '../db/schema/admin-user.js';
import { AdminUserRepository } from './admin-user.repository.js';

const DATABASE_URL = process.env['DATABASE_URL'];

const ROLLBACK: unique symbol = Symbol('rollback');

const AUTHOR_HASH = '$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA';

const SKEMA = `test_${randomBytes(6).toString('hex')}`;

const MIGRATION_DIRECTORY = path.join(import.meta.dirname, '..', 'db', 'migrations');

const MIGRATION_FILES = ['0000_init_schema.sql', '0001_audit_unpublish_action.sql'];

const AKTOR_ID = '11111111-1111-4111-8111-111111111111';

type Klien = ReturnType<typeof postgres>;

type Database = PostgresJsDatabase<typeof schema>;

let admin: Klien;

let client: Klien;

let root: Database;

function tanpaKualifikasiSkema(sqlMigrasi: string): string {
  return sqlMigrasi.replaceAll('"public".', '');
}

function repositoryOf(db: Database): AdminUserRepository {
  return new AdminUserRepository({ db } as unknown as DatabaseService);
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
  for (const name of MIGRATION_FILES) {
    const body = await readFile(path.join(MIGRATION_DIRECTORY, name), 'utf8');

    await client.unsafe(tanpaKualifikasiSkema(body)).simple();
  }
}

async function siapkanData(db: Database): Promise<void> {
  await db.insert(adminUser).values([
    {
      id: AKTOR_ID,
      username: 'budi',
      displayName: 'Budi Santoso',
      passwordHash: AUTHOR_HASH,
      role: 'admin',
    },
    {
      username: 'sari',
      displayName: 'Sari Editor',
      passwordHash: AUTHOR_HASH,
      role: 'editor',
    },
    {
      username: 'tono',
      displayName: 'Tono Nonaktif',
      passwordHash: AUTHOR_HASH,
      role: 'editor',
      isActive: false,
    },
    {
      username: 'persen_100',
      displayName: 'Uji 100%',
      passwordHash: AUTHOR_HASH,
      role: 'editor',
    },
  ]);
}

describe.skipIf(DATABASE_URL === undefined)(
  'AdminUserRepository dengan basis data nyata',
  () => {
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

    it('mengurutkan akun berdasarkan nama pengguna', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);

        const hasil = await repositoryOf(db).findPage({ page: 1, perPage: 10 });

        expect(hasil.total).toBe(4);
        expect(hasil.rows.map((row) => row.username)).toEqual([
          'budi',
          'persen_100',
          'sari',
          'tono',
        ]);
      });
    });

    it('menyaring peran dan status aktif', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);
        const repository = repositoryOf(db);

        const editor = await repository.findPage({ page: 1, perPage: 10, role: 'editor' });
        const nonaktif = await repository.findPage({ page: 1, perPage: 10, active: false });

        expect(editor.rows.map((row) => row.username)).toEqual(['persen_100', 'sari', 'tono']);
        expect(nonaktif.rows.map((row) => row.username)).toEqual(['tono']);
      });
    });

    it('memperlakukan tanda persen sebagai teks biasa saat mencari', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);

        const hasil = await repositoryOf(db).findPage({ page: 1, perPage: 10, search: '100%' });

        expect(hasil.rows.map((row) => row.username)).toEqual(['persen_100']);
      });
    });

    it('mencari pada nama tampilan tanpa membedakan huruf besar kecil', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);

        const hasil = await repositoryOf(db).findPage({ page: 1, perPage: 10, search: 'sari' });

        expect(hasil.rows.map((row) => row.username)).toEqual(['sari']);
      });
    });

    it('menghitung administrator aktif selain akun yang dikecualikan', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);
        const repository = repositoryOf(db);

        await expect(repository.countActiveAdmins(db, AKTOR_ID)).resolves.toBe(0);
        await expect(repository.countActiveAdmins(db, '99999999-9999-4999-8999-999999999999'))
          .resolves.toBe(1);
      });
    });

    it('mengambil kunci penjaga administrator tanpa menggagalkan transaksi', async () => {
      await dalamTransaksi(async (db) => {
        const repository = repositoryOf(db);

        await expect(db.transaction(async (tx) => repository.lockAdminGuard(tx))).resolves.toBeUndefined();
      });
    });

    it('menonaktifkan akun lalu memindahkannya ke hasil saringan nonaktif', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);
        const repository = repositoryOf(db);
        const sari = await repository.findPage({ page: 1, perPage: 10, search: 'sari' });
        const sariId = sari.rows[0]?.id;

        if (sariId === undefined) {
          throw new Error('Akun uji tidak ditemukan');
        }

        await repository.update(db, sariId, { isActive: false });

        const aktif = await repository.findPage({ page: 1, perPage: 10, active: true });
        const nonaktif = await repository.findPage({ page: 1, perPage: 10, active: false });

        expect(aktif.rows.some((row) => row.id === sariId)).toBe(false);
        expect(nonaktif.rows.map((row) => row.username)).toContain('sari');
      });
    });
  },
);
