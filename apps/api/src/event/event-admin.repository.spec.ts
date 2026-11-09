import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { DatabaseService } from '../db/database.service.js';
import { migrationBodies } from '../db/migration-catalog.js';
import * as schema from '../db/schema/index.js';
import { adminUser } from '../db/schema/admin-user.js';
import { event } from '../db/schema/event.js';
import { slugRedirect } from '../db/schema/slug-redirect.js';
import { recordSlugRedirect } from '../db/slug-redirect.js';
import { EventAdminRepository } from './event-admin.repository.js';

const DATABASE_URL = process.env['DATABASE_URL'];

const ROLLBACK: unique symbol = Symbol('rollback');

const AUTHOR_HASH = '$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA';

const SKEMA = `test_${randomBytes(6).toString('hex')}`;

type Klien = ReturnType<typeof postgres>;

type Database = PostgresJsDatabase<typeof schema>;

let admin: Klien;

let client: Klien;

let root: Database;

function repositoryOf(db: Database): EventAdminRepository {
  return new EventAdminRepository({ db } as unknown as DatabaseService);
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

async function siapkanData(db: Database): Promise<string> {
  const [penulis] = await db
    .insert(adminUser)
    .values({
      username: `uji-${Date.now()}`,
      displayName: 'Budi Santoso',
      passwordHash: AUTHOR_HASH,
    })
    .returning({ id: adminUser.id });

  if (penulis === undefined) {
    throw new Error('Gagal membuat pengguna uji');
  }

  await db.insert(event).values([
    {
      slug: 'rapat-wali',
      title: 'Rapat Wali Murid',
      description: 'Rapat bulanan wali murid.',
      location: 'Ruang Guru',
      startsAt: '2026-12-05 02:00:00+00',
      endsAt: '2026-12-05 04:00:00+00',
      status: 'draft',
      createdBy: penulis.id,
      updatedAt: '2026-12-01 02:00:00+00',
    },
    {
      slug: 'pensi-sekolah',
      title: 'Pensi Sekolah',
      location: 'Aula',
      startsAt: '2026-12-10 02:00:00+00',
      endsAt: null,
      status: 'published',
      createdBy: penulis.id,
      updatedAt: '2026-12-03 02:00:00+00',
    },
    {
      slug: 'lomba-antar-kelas',
      title: 'Lomba Antar Kelas',
      location: null,
      startsAt: '2026-12-20 02:00:00+00',
      endsAt: '2026-12-20 06:00:00+00',
      status: 'archived',
      createdBy: penulis.id,
      updatedAt: '2026-12-02 02:00:00+00',
    },
  ]);

  return penulis.id;
}

async function idOf(db: Database, slug: string): Promise<string> {
  const rows = await db.select({ id: event.id }).from(event).where(eq(event.slug, slug));
  const row = rows[0];

  if (row === undefined) {
    throw new Error(`Data uji ${slug} tidak ditemukan`);
  }

  return row.id;
}

describe.skipIf(DATABASE_URL === undefined)(
  'EventAdminRepository dengan basis data nyata',
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

    it('menampilkan semua status dan mengurutkan perubahan terbaru lebih dulu', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);

        const hasil = await repositoryOf(db).findPage({ page: 1, perPage: 10 });

        expect(hasil.total).toBe(3);
        expect(hasil.rows.map((row) => row.slug)).toEqual([
          'pensi-sekolah',
          'lomba-antar-kelas',
          'rapat-wali',
        ]);
      });
    });

    it('mengikutkan nama penulis dari tabel pengguna', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);

        const hasil = await repositoryOf(db).findPage({ page: 1, perPage: 10 });

        expect(hasil.rows.every((row) => row.authorName === 'Budi Santoso')).toBe(true);
      });
    });

    it('menyaring berdasarkan status', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);
        const repository = repositoryOf(db);

        const draf = await repository.findPage({ page: 1, perPage: 10, status: 'draft' });
        const arsip = await repository.findPage({ page: 1, perPage: 10, status: 'archived' });

        expect(draf.rows.map((row) => row.slug)).toEqual(['rapat-wali']);
        expect(arsip.rows.map((row) => row.slug)).toEqual(['lomba-antar-kelas']);
      });
    });

    it('membaca detail beserta deskripsi', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);
        const id = await idOf(db, 'rapat-wali');

        const hasil = await repositoryOf(db).findById(db, id);

        expect(hasil?.description).toBe('Rapat bulanan wali murid.');
        expect(hasil?.location).toBe('Ruang Guru');
        expect(hasil?.endsAt).not.toBeNull();
      });
    });

    it('menaikkan versi dan menolak perubahan dengan versi usang', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);
        const repository = repositoryOf(db);
        const id = await idOf(db, 'pensi-sekolah');

        const berhasil = await db.transaction(async (tx) =>
          repository.update(tx as never, id, 1, { title: 'Pensi Baru' }),
        );

        expect(berhasil).toEqual({ id });

        const sesudah = await repository.findById(db, id);

        expect(sesudah?.title).toBe('Pensi Baru');
        expect(sesudah?.version).toBe(2);

        const bentrok = await db.transaction(async (tx) =>
          repository.update(tx as never, id, 1, { title: 'Bentrok' }),
        );

        expect(bentrok).toBeUndefined();
      });
    });

    it('memperbarui tanpa syarat versi ketika If-Match tidak dikirim', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);
        const repository = repositoryOf(db);
        const id = await idOf(db, 'pensi-sekolah');

        const hasil = await db.transaction(async (tx) =>
          repository.update(tx as never, id, undefined, { location: 'Lapangan' }),
        );

        expect(hasil).toEqual({ id });
      });
    });

    it('menolak waktu selesai sebelum waktu mulai lewat constraint basis data', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);
        const repository = repositoryOf(db);
        const id = await idOf(db, 'rapat-wali');

        await expect(
          db.transaction(async (tx) =>
            repository.update(tx as never, id, undefined, { endsAt: '2026-12-05 01:00:00+00' }),
          ),
        ).rejects.toThrow();
      });
    });

    it('menulis dan mengganti redirect slug lama', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);
        const id = await idOf(db, 'pensi-sekolah');

        await db.transaction(async (tx) => {
          await recordSlugRedirect(tx as never, 'event', 'pensi-lama', id);
          await recordSlugRedirect(tx as never, 'event', 'pensi-lama', id);
        });

        const tersimpan = await db.select().from(slugRedirect);

        expect(tersimpan).toHaveLength(1);
        expect(tersimpan[0]?.resourceType).toBe('event');
        expect(tersimpan[0]?.resourceId).toBe(id);
      });
    });
  },
);
