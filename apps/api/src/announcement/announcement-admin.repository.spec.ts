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
import { announcement } from '../db/schema/announcement.js';
import { slugRedirect } from '../db/schema/slug-redirect.js';
import { AnnouncementAdminRepository } from './announcement-admin.repository.js';

const DATABASE_URL = process.env['DATABASE_URL'];

const ROLLBACK: unique symbol = Symbol('rollback');

const AUTHOR_HASH = '$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA';

const SKEMA = `test_${randomBytes(6).toString('hex')}`;

type Klien = ReturnType<typeof postgres>;

type Database = PostgresJsDatabase<typeof schema>;

let admin: Klien;

let client: Klien;

let root: Database;

function repositoryOf(db: Database): AnnouncementAdminRepository {
  return new AnnouncementAdminRepository({ db } as unknown as DatabaseService);
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

  await db.insert(announcement).values([
    {
      slug: 'draf-jadwal',
      title: 'Draf Jadwal',
      excerpt: 'Masih draf.',
      body: 'Jadwal belum final.',
      category: 'akademik',
      status: 'draft',
      authorId: penulis.id,
      updatedAt: '2026-11-01 02:00:00+00',
    },
    {
      slug: 'pensi-sekolah',
      title: 'Pensi Sekolah',
      excerpt: 'Pensi tahunan.',
      body: 'Pensi digelar Desember.',
      category: 'kegiatan',
      status: 'published',
      authorId: penulis.id,
      publishedAt: '2026-10-30 02:00:00+00',
      updatedAt: '2026-10-30 02:00:00+00',
    },
    {
      slug: 'rapat-wali',
      title: 'Rapat Wali Murid',
      excerpt: 'Rapat bulanan.',
      body: 'Rapat membahas hasil belajar.',
      category: 'umum',
      status: 'archived',
      authorId: penulis.id,
      publishedAt: '2026-10-28 02:00:00+00',
      updatedAt: '2026-10-29 02:00:00+00',
    },
  ]);

  return penulis.id;
}

async function idOf(db: Database, slug: string): Promise<string> {
  const rows = await db
    .select({ id: announcement.id })
    .from(announcement)
    .where(eq(announcement.slug, slug));
  const row = rows[0];

  if (row === undefined) {
    throw new Error(`Data uji ${slug} tidak ditemukan`);
  }

  return row.id;
}

describe.skipIf(DATABASE_URL === undefined)(
  'AnnouncementAdminRepository dengan basis data nyata',
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

    it('menampilkan draf dan arsip, bukan hanya konten terbit', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);

        const hasil = await repositoryOf(db).findPage({ page: 1, perPage: 10 });

        expect(hasil.total).toBe(3);
        expect(hasil.rows.map((row) => row.status).sort()).toEqual([
          'archived',
          'draft',
          'published',
        ]);
        expect(hasil.rows[0]?.authorName).toBe('Budi Santoso');
      });
    });

    it('mengurutkan berdasarkan perubahan terbaru', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);

        const hasil = await repositoryOf(db).findPage({ page: 1, perPage: 10 });

        expect(hasil.rows.map((row) => row.slug)).toEqual([
          'draf-jadwal',
          'pensi-sekolah',
          'rapat-wali',
        ]);
      });
    });

    it('menyaring status, kategori, dan kata kunci sekaligus', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);
        const repository = repositoryOf(db);

        const draf = await repository.findPage({ page: 1, perPage: 10, status: 'draft' });
        const kategori = await repository.findPage({ page: 1, perPage: 10, category: 'kegiatan' });
        const cari = await repository.findPage({ page: 1, perPage: 10, search: 'rapat' });

        expect(draf.rows.map((row) => row.slug)).toEqual(['draf-jadwal']);
        expect(kategori.rows.map((row) => row.slug)).toEqual(['pensi-sekolah']);
        expect(cari.rows.map((row) => row.slug)).toEqual(['rapat-wali']);
      });
    });

    it('mengabaikan kata kunci yang hanya berisi tanda baca', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);

        const hasil = await repositoryOf(db).findPage({ page: 1, perPage: 10, search: '%%%' });

        expect(hasil.total).toBe(3);
      });
    });

    it('mengubah baris hanya bila versi cocok dan menaikkan versi', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);
        const repository = repositoryOf(db);
        const id = await idOf(db, 'pensi-sekolah');

        const berhasil = await db.transaction(async (tx) =>
          repository.update(tx as never, id, 1, { title: 'Pensi Baru' }),
        );

        expect(berhasil).toEqual({ id });

        const sesudah = await repository.findById(id);

        expect(sesudah?.title).toBe('Pensi Baru');
        expect(sesudah?.version).toBe(2);

        const bentrok = await db.transaction(async (tx) =>
          repository.update(tx as never, id, 1, { title: 'Bentrok' }),
        );

        expect(bentrok).toBeUndefined();
      });
    });

    it('menyimpan dan mengganti tujuan redirect slug lama', async () => {
      await dalamTransaksi(async (db) => {
        const penulis = await siapkanData(db);
        const repository = repositoryOf(db);

        await db.transaction(async (tx) => {
          await repository.recordRedirect(tx as never, 'slug-lama', penulis);
          await repository.recordRedirect(tx as never, 'slug-lama', penulis);
        });

        const tersimpan = await db.select().from(slugRedirect);

        expect(tersimpan).toHaveLength(1);
        expect(tersimpan[0]?.resourceId).toBe(penulis);

        await db.transaction(async (tx) => repository.dropRedirect(tx as never, 'slug-lama'));

        await expect(db.select().from(slugRedirect)).resolves.toHaveLength(0);
      });
    });
  },
);
