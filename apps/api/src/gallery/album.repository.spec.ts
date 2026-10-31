import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { desc, eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { DatabaseService } from '../db/database.service.js';
import * as schema from '../db/schema/index.js';
import { adminUser } from '../db/schema/admin-user.js';
import { galleryAlbum, galleryImage } from '../db/schema/gallery.js';
import { AlbumRepository } from './album.repository.js';

const DATABASE_URL = process.env['DATABASE_URL'];

const ROLLBACK: unique symbol = Symbol('rollback');

const AUTHOR_HASH = '$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA';

const SKEMA = `test_${randomBytes(6).toString('hex')}`;

const MIGRATION_FILE = path.join(
  import.meta.dirname,
  '..',
  'db',
  'migrations',
  '0000_init_schema.sql',
);

type Klien = ReturnType<typeof postgres>;

type Database = PostgresJsDatabase<typeof schema>;

type Kontekst = { penulisId: string; albumId: string; fotoIds: string[] };

let admin: Klien;

let client: Klien;

let root: Database;

function tanpaKualifikasiSkema(sqlMigrasi: string): string {
  return sqlMigrasi.replaceAll('"public".', '');
}

function repositoryOf(db: Database): AlbumRepository {
  return new AlbumRepository({ db } as unknown as DatabaseService);
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

async function buatPenulis(db: Database): Promise<string> {
  const [penulis] = await db
    .insert(adminUser)
    .values({ username: `uji-${Date.now()}`, displayName: 'Uji', passwordHash: AUTHOR_HASH })
    .returning({ id: adminUser.id });

  if (penulis === undefined) {
    throw new Error('Gagal membuat pengguna uji');
  }

  return penulis.id;
}

async function siapkanData(db: Database): Promise<Kontekst> {
  const penulisId = await buatPenulis(db);

  const albumRows = await db
    .insert(galleryAlbum)
    .values([
      {
        slug: 'pensi-2026',
        title: 'Pensi 2026',
        eventDate: '2026-10-20',
        status: 'published',
        createdBy: penulisId,
        publishedAt: '2026-10-21T01:00:00Z',
      },
      {
        slug: 'ldks-2026',
        title: 'LDKS 2026',
        eventDate: '2026-11-02',
        status: 'published',
        createdBy: penulisId,
        publishedAt: '2026-11-03T01:00:00Z',
      },
      {
        slug: 'draf-internal',
        title: 'Draf Internal',
        eventDate: '2026-12-01',
        status: 'draft',
        createdBy: penulisId,
        publishedAt: null,
      },
      {
        slug: 'arsip-lama',
        title: 'Arsip Lama',
        eventDate: '2025-08-01',
        status: 'archived',
        createdBy: penulisId,
        publishedAt: '2025-08-02T01:00:00Z',
      },
    ])
    .returning({ id: galleryAlbum.id, slug: galleryAlbum.slug });

  const pensi = albumRows.find((row) => row.slug === 'pensi-2026');

  if (pensi === undefined) {
    throw new Error('Album uji tidak terbentuk');
  }

  const foto = await db
    .insert(galleryImage)
    .values([
      {
        albumId: pensi.id,
        storageKey: 'pensi-2026/a.png',
        width: 1024,
        height: 768,
        thumbWidth: 480,
        thumbHeight: 360,
        byteSize: 1000,
        mimeType: 'image/webp',
        altText: 'Panggung pensi',
        sortOrder: 1,
      },
      {
        albumId: pensi.id,
        storageKey: 'pensi-2026/b.png',
        width: 1024,
        height: 768,
        thumbWidth: 480,
        thumbHeight: 360,
        byteSize: 1000,
        mimeType: 'image/webp',
        altText: 'Penonton pensi',
        sortOrder: 0,
      },
      {
        albumId: pensi.id,
        storageKey: 'pensi-2026/c.png',
        width: 800,
        height: 600,
        thumbWidth: 480,
        thumbHeight: 360,
        byteSize: 500,
        mimeType: 'image/webp',
        altText: null,
        sortOrder: 2,
      },
    ])
    .returning({ id: galleryImage.id, storageKey: galleryImage.storageKey });

  const urut = foto
    .slice()
    .sort((a, b) => a.storageKey.localeCompare(b.storageKey))
    .map((row) => row.id);

  await db
    .update(galleryAlbum)
    .set({ coverImageId: urut[0] })
    .where(eq(galleryAlbum.id, pensi.id));

  return { penulisId, albumId: pensi.id, fotoIds: urut };
}

describe.skipIf(DATABASE_URL === undefined)('AlbumRepository dengan basis data nyata', () => {
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

    await client.unsafe(tanpaKualifikasiSkema(await readFile(MIGRATION_FILE, 'utf8'))).simple();
  });

  afterAll(async () => {
    await client.end({ timeout: 5 });
    await admin.unsafe(`drop schema if exists ${SKEMA} cascade`);
    await admin.end({ timeout: 5 });
  });

  it('hanya mendaftar album terbit dan mengurutkan tanggal kegiatan menurun', async () => {
    await dalamTransaksi(async (db) => {
      await siapkanData(db);

      const hasil = await repositoryOf(db).findPage(1, 12);

      expect(hasil.total).toBe(2);
      expect(hasil.rows.map((row) => row.slug)).toEqual(['ldks-2026', 'pensi-2026']);
    });
  });

  it('menghitung jumlah foto per album dalam satu agregasi', async () => {
    await dalamTransaksi(async (db) => {
      await siapkanData(db);

      const hasil = await repositoryOf(db).findPage(1, 12);
      const pensi = hasil.rows.find((row) => row.slug === 'pensi-2026');

      const jumlah = await repositoryOf(db).countImages(
        pensi === undefined ? [] : [pensi.id],
      );

      expect(pensi === undefined ? -1 : jumlah.get(pensi.id)).toBe(3);
    });
  });

  it('tidak menyertakan album tanpa foto pada peta jumlah', async () => {
    await dalamTransaksi(async (db) => {
      await siapkanData(db);

      const hasil = await repositoryOf(db).findPage(1, 12);
      const ldks = hasil.rows.find((row) => row.slug === 'ldks-2026');

      const jumlah = await repositoryOf(db).countImages(
        ldks === undefined ? [] : [ldks.id],
      );

      expect(jumlah.get(ldks?.id ?? '') ?? 0).toBe(0);
    });
  });

  it('menyembunyikan album draf dari daftar dan pencarian slug', async () => {
    await dalamTransaksi(async (db) => {
      await siapkanData(db);
      const repository = repositoryOf(db);

      const daftar = await repository.findPage(1, 12);

      expect(daftar.rows.some((row) => row.slug === 'draf-internal')).toBe(false);
      expect(await repository.findVisibleBySlug('draf-internal')).toBeUndefined();
    });
  });

  it('masih membuka album arsip lewat slug', async () => {
    await dalamTransaksi(async (db) => {
      await siapkanData(db);

      expect((await repositoryOf(db).findVisibleBySlug('arsip-lama'))?.slug).toBe('arsip-lama');
    });
  });

  it('mengurutkan foto berdasarkan sort_order lalu id', async () => {
    await dalamTransaksi(async (db) => {
      const { albumId } = await siapkanData(db);

      const foto = await repositoryOf(db).findImages(albumId, 1, 24);

      expect(foto.map((row) => row.sortOrder)).toEqual([0, 1, 2]);
      expect(foto[0]?.altText).toBe('Penonton pensi');
    });
  });

  it('membatasi foto sesuai ukuran halaman dan menggeser offset', async () => {
    await dalamTransaksi(async (db) => {
      const { albumId } = await siapkanData(db);
      const repository = repositoryOf(db);

      const pertama = await repository.findImages(albumId, 1, 2);
      const kedua = await repository.findImages(albumId, 2, 2);

      expect(pertama).toHaveLength(2);
      expect(kedua).toHaveLength(1);
      expect(pertama[0]?.id).not.toBe(kedua[0]?.id);
    });
  });

  it('hanya mengembalikan sampul yang berasal dari album yang sama', async () => {
    await dalamTransaksi(async (db) => {
      const { albumId, fotoIds } = await siapkanData(db);
      const repository = repositoryOf(db);

      expect((await repository.findCoverImage(albumId, fotoIds[0] ?? ''))?.id).toBe(fotoIds[0]);

      const albumLain = await db
        .select({ id: galleryAlbum.id })
        .from(galleryAlbum)
        .where(eq(galleryAlbum.slug, 'ldks-2026'))
        .orderBy(desc(galleryAlbum.id))
        .limit(1);

      expect(
        await repository.findCoverImage(albumLain[0]?.id ?? '', fotoIds[0] ?? ''),
      ).toBeUndefined();
    });
  });

  it('menemukan album lewat id walau sudah diarsipkan tetapi tidak lewat draf', async () => {
    await dalamTransaksi(async (db) => {
      await siapkanData(db);
      const repository = repositoryOf(db);

      const arsip = await db
        .select({ id: galleryAlbum.id })
        .from(galleryAlbum)
        .where(eq(galleryAlbum.slug, 'arsip-lama'));
      const draf = await db
        .select({ id: galleryAlbum.id })
        .from(galleryAlbum)
        .where(eq(galleryAlbum.slug, 'draf-internal'));

      expect((await repository.findVisibleById(arsip[0]?.id ?? ''))?.slug).toBe('arsip-lama');
      expect(await repository.findVisibleById(draf[0]?.id ?? '')).toBeUndefined();
    });
  });

  it('menghapus foto otomatis saat albumnya dihapus', async () => {
    await dalamTransaksi(async (db) => {
      const { albumId } = await siapkanData(db);

      await db.delete(galleryAlbum).where(eq(galleryAlbum.id, albumId));

      const sisa = await db.select({ id: galleryImage.id }).from(galleryImage);

      expect(sisa).toEqual([]);
    });
  });

  it('mengosongkan sampul saat fotonya dihapus', async () => {
    await dalamTransaksi(async (db) => {
      const { albumId, fotoIds } = await siapkanData(db);

      await db.delete(galleryImage).where(eq(galleryImage.id, fotoIds[0] ?? ''));

      const baris = await db
        .select({ coverImageId: galleryAlbum.coverImageId })
        .from(galleryAlbum)
        .where(eq(galleryAlbum.id, albumId));

      expect(baris[0]?.coverImageId).toBeNull();
    });
  });

  it('menolak album terbit tanpa tanggal terbit', async () => {
    await dalamTransaksi(async (db) => {
      const penulisId = await buatPenulis(db);

      await expect(
        db.insert(galleryAlbum).values({
          slug: 'tanpa-tanggal',
          title: 'Tanpa Tanggal',
          eventDate: '2026-10-20',
          status: 'published',
          createdBy: penulisId,
          publishedAt: null,
        }),
      ).rejects.toThrow();
    });
  });
});
