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
import { AnnouncementRepository } from './announcement.repository.js';

const DATABASE_URL = process.env['DATABASE_URL'];

const ROLLBACK: unique symbol = Symbol('rollback');

const AUTHOR_HASH = '$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA';

const SKEMA = `test_${randomBytes(6).toString('hex')}`;

const WAKTU = (hari: number): string => `2026-10-${String(hari).padStart(2, '0')}T02:00:00.000Z`;

type Klien = ReturnType<typeof postgres>;

type Database = PostgresJsDatabase<typeof schema>;

let admin: Klien;

let client: Klien;

let root: Database;

function repositoryOf(db: Database): AnnouncementRepository {
  return new AnnouncementRepository({ db } as unknown as DatabaseService);
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

async function siapkanData(db: Database): Promise<string> {
  const [penulis] = await db
    .insert(adminUser)
    .values({ username: `uji-${Date.now()}`, displayName: 'Uji', passwordHash: AUTHOR_HASH })
    .returning({ id: adminUser.id });

  if (penulis === undefined) {
    throw new Error('Gagal membuat pengguna uji');
  }

  await db.insert(announcement).values([
    {
      slug: 'perubahan-jadwal',
      title: 'Perubahan Jadwal Ujian',
      excerpt: 'Ujian dimulai 07.30',
      body: 'Ujian praktik dimulai pukul 07.30.',
      category: 'akademik',
      status: 'published',
      authorId: penulis.id,
      publishedAt: WAKTU(3),
    },
    {
      slug: 'pensi-sekolah',
      title: 'Pensi Sekolah',
      excerpt: 'Pensi diadakan bulan ini',
      body: 'Kami menjadwalkan ulang pensi menjadi minggu depan.',
      category: 'kegiatan',
      status: 'published',
      authorId: penulis.id,
      publishedAt: WAKTU(2),
    },
    {
      slug: 'diskon-serbatus',
      title: 'Diskon 100% Spesial',
      excerpt: 'Promo diskon 100%',
      body: 'Promo diskon 100% untuk anggota.',
      category: 'umum',
      status: 'published',
      authorId: penulis.id,
      publishedAt: WAKTU(1),
    },
    {
      slug: 'draf-rahasia',
      title: 'Draf Rahasia',
      excerpt: 'Belum boleh dibaca',
      body: 'Isi draf yang belum terbit.',
      category: 'umum',
      status: 'draft',
      authorId: penulis.id,
      publishedAt: null,
    },
    {
      slug: 'pengumuman-arsip',
      title: 'Pengumuman Arsip',
      excerpt: 'Sudah diarsipkan',
      body: 'Konten yang sudah diarsipkan.',
      category: 'umum',
      status: 'archived',
      authorId: penulis.id,
      publishedAt: WAKTU(1),
    },
  ]);

  return penulis.id;
}

describe.skipIf(DATABASE_URL === undefined)(
  'AnnouncementRepository dengan basis data nyata',
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

      for (const body of await migrationBodies()) {
        await client.unsafe(body).simple();
      }
    });

    afterAll(async () => {
      await client.end({ timeout: 5 });
      await admin.unsafe(`drop schema if exists ${SKEMA} cascade`);
      await admin.end({ timeout: 5 });
    });

    it('hanya mengembalikan pengumuman terbit dan mengurutkan tanggal menurun', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);

        const hasil = await repositoryOf(db).findPage({
          page: 1,
          perPage: 10,
          includeArchived: false,
        });

        expect(hasil.total).toBe(3);
        expect(hasil.rows.map((row) => row.slug)).toEqual([
          'perubahan-jadwal',
          'pensi-sekolah',
          'diskon-serbatus',
        ]);
        expect(hasil.rows.some((row) => row.status === 'draft')).toBe(false);
      });
    });

    it('menyembunyikan arsip kecuali diminta', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);
        const repository = repositoryOf(db);

        const tersembunyi = await repository.findPage({
          page: 1,
          perPage: 50,
          includeArchived: false,
        });
        const terbuka = await repository.findPage({ page: 1, perPage: 50, includeArchived: true });

        expect(tersembunyi.rows.some((row) => row.slug === 'pengumuman-arsip')).toBe(false);
        expect(terbuka.rows.some((row) => row.slug === 'pengumuman-arsip')).toBe(true);
        expect(terbuka.total).toBe(4);
      });
    });

    it('menyaring kategori tanpa mencampur kategori lain', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);

        const hasil = await repositoryOf(db).findPage({
          page: 1,
          perPage: 10,
          category: 'kegiatan',
          includeArchived: false,
        });

        expect(hasil.rows.map((row) => row.slug)).toEqual(['pensi-sekolah']);
        expect(hasil.total).toBe(1);
      });
    });

    it('mencocokkan kata utuh dan tidak mencocokkan potongan di tengah kata', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);

        const hasil = await repositoryOf(db).findPage({
          page: 1,
          perPage: 10,
          search: 'jadwal',
          includeArchived: false,
        });

        expect(hasil.rows.map((row) => row.slug)).toEqual(['perubahan-jadwal']);
      });
    });

    it('memperlakukan tanda persen sebagai teks biasa, bukan wildcard', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);

        const hasil = await repositoryOf(db).findPage({
          page: 1,
          perPage: 50,
          search: '100%',
          includeArchived: false,
        });

        expect(hasil.rows.map((row) => row.slug)).toEqual(['diskon-serbatus']);
      });
    });

    it('mengabaikan kata kunci yang hanya berisi tanda baca', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);

        const hasil = await repositoryOf(db).findPage({
          page: 1,
          perPage: 50,
          search: '%%%',
          includeArchived: false,
        });

        expect(hasil.total).toBe(3);
      });
    });

    it('menerapkan paginasi dengan total yang konsisten', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);
        const repository = repositoryOf(db);

        const pertama = await repository.findPage({ page: 1, perPage: 2, includeArchived: false });
        const kedua = await repository.findPage({ page: 2, perPage: 2, includeArchived: false });
        const ketiga = await repository.findPage({ page: 3, perPage: 2, includeArchived: false });

        expect(pertama.rows.map((row) => row.slug)).toEqual(['perubahan-jadwal', 'pensi-sekolah']);
        expect(kedua.rows.map((row) => row.slug)).toEqual(['diskon-serbatus']);
        expect(ketiga.rows).toEqual([]);
        expect(ketiga.total).toBe(3);
      });
    });

    it('menemukan slug terbit dan arsip tetapi bukan draf', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);
        const repository = repositoryOf(db);

        expect((await repository.findVisibleBySlug('perubahan-jadwal'))?.slug).toBe(
          'perubahan-jadwal',
        );
        expect((await repository.findVisibleBySlug('pengumuman-arsip'))?.slug).toBe(
          'pengumuman-arsip',
        );
        expect(await repository.findVisibleBySlug('draf-rahasia')).toBeUndefined();
      });
    });

    it('menolak membaca draf lewat pencarian berdasarkan id', async () => {
      await dalamTransaksi(async (db) => {
        await siapkanData(db);
        const draf = await db
          .select({ id: announcement.id })
          .from(announcement)
          .where(eq(announcement.slug, 'draf-rahasia'));

        expect(draf[0]).toBeDefined();
        expect(await repositoryOf(db).findVisibleById(draf[0]?.id ?? '')).toBeUndefined();
      });
    });

    it('mencari tujuan redirect hanya untuk tipe sumber pengumuman', async () => {
      await dalamTransaksi(async (db) => {
        const penulisId = await siapkanData(db);

        await db.insert(slugRedirect).values([
          { oldSlug: 'slug-lama-pengumuman', resourceType: 'announcement', resourceId: penulisId },
          { oldSlug: 'slug-lama-album', resourceType: 'album', resourceId: penulisId },
        ]);

        const repository = repositoryOf(db);

        expect(await repository.findRedirectTargetId('slug-lama-pengumuman')).toBe(penulisId);
        expect(await repository.findRedirectTargetId('slug-lama-album')).toBeUndefined();
        expect(await repository.findRedirectTargetId('slug-tidak-ada')).toBeUndefined();
      });
    });
  },
);
