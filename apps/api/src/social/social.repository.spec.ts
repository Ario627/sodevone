import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { DatabaseService } from '../db/database.service.js';
import { migrationBodies } from '../db/migration-catalog.js';
import * as schema from '../db/schema/index.js';
import { adminUser } from '../db/schema/admin-user.js';
import { galleryAlbum, galleryImage } from '../db/schema/gallery.js';
import { socialLink } from '../db/schema/social-link.js';
import { SocialRepository } from './social.repository.js';

const DATABASE_URL = process.env['DATABASE_URL'];

const ROLLBACK: unique symbol = Symbol('rollback');

const AUTHOR_HASH = '$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA';

const SKEMA = `test_${randomBytes(6).toString('hex')}`;

type Klien = ReturnType<typeof postgres>;

type Database = PostgresJsDatabase<typeof schema>;

type Kontekst = { penulisId: string; albumId: string; fotoId: string };

let admin: Klien;

let client: Klien;

let root: Database;

function repositoryOf(db: Database): SocialRepository {
  return new SocialRepository({ db } as unknown as DatabaseService);
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

async function siapkanData(db: Database): Promise<Kontekst> {
  const [penulis] = await db
    .insert(adminUser)
    .values({ username: `uji-${Date.now()}`, displayName: 'Uji', passwordHash: AUTHOR_HASH })
    .returning({ id: adminUser.id });

  if (penulis === undefined) {
    throw new Error('Gagal membuat pengguna uji');
  }

  const [album] = await db
    .insert(galleryAlbum)
    .values({
      slug: 'pensi-2026',
      title: 'Pensi 2026',
      eventDate: '2026-10-20',
      status: 'published',
      createdBy: penulis.id,
      publishedAt: '2026-10-21T01:00:00Z',
    })
    .returning({ id: galleryAlbum.id });

  if (album === undefined) {
    throw new Error('Gagal membuat album uji');
  }

  const [foto] = await db
    .insert(galleryImage)
    .values({
      albumId: album.id,
      storageKey: 'pensi-2026/a.webp',
      width: 1600,
      height: 1200,
      thumbWidth: 480,
      thumbHeight: 360,
      byteSize: 1000,
      mimeType: 'image/webp',
      altText: 'Panggung pensi',
      sortOrder: 0,
    })
    .returning({ id: galleryImage.id });

  if (foto === undefined) {
    throw new Error('Gagal membuat foto uji');
  }

  await db.insert(socialLink).values([
    {
      platform: 'instagram',
      url: 'https://www.instagram.com/p/urutan-dua/',
      caption: 'Urutan dua',
      imageId: foto.id,
      sortOrder: 2,
      isVisible: true,
      createdBy: penulis.id,
    },
    {
      platform: 'tiktok',
      url: 'https://www.tiktok.com/@kelas/video/1',
      caption: 'Urutan satu',
      imageUrl: 'https://cdn.contoh.test/poster.jpg',
      imageWidth: 1080,
      imageHeight: 1080,
      altText: 'Poster',
      sortOrder: 1,
      isVisible: true,
      createdBy: penulis.id,
    },
    {
      platform: 'instagram',
      url: 'https://www.instagram.com/p/disembunyikan/',
      caption: 'Tidak tampil',
      imageUrl: 'https://cdn.contoh.test/sembunyi.jpg',
      imageWidth: 800,
      imageHeight: 800,
      sortOrder: 0,
      isVisible: false,
      createdBy: penulis.id,
    },
  ]);

  return { penulisId: penulis.id, albumId: album.id, fotoId: foto.id };
}

describe.skipIf(DATABASE_URL === undefined)('SocialRepository dengan basis data nyata', () => {
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

  it('hanya mendaftar tautan tampil dan mengurutkan sort_order menaik', async () => {
    await dalamTransaksi(async (db) => {
      await siapkanData(db);

      const hasil = await repositoryOf(db).findVisible(8);

      expect(hasil.map((row) => row.caption)).toEqual(['Urutan satu', 'Urutan dua']);
    });
  });

  it('membawa dimensi dan teks alternatif dari media lokal', async () => {
    await dalamTransaksi(async (db) => {
      const konteks = await siapkanData(db);

      const hasil = await repositoryOf(db).findVisible(8);
      const lokal = hasil.find((row) => row.imageId === konteks.fotoId);

      expect(lokal?.galleryWidth).toBe(1600);
      expect(lokal?.galleryHeight).toBe(1200);
      expect(lokal?.galleryAltText).toBe('Panggung pensi');
    });
  });

  it('menghormati batas jumlah yang diminta', async () => {
    await dalamTransaksi(async (db) => {
      await siapkanData(db);

      const hasil = await repositoryOf(db).findVisible(1);

      expect(hasil).toHaveLength(1);
      expect(hasil[0]?.caption).toBe('Urutan satu');
    });
  });

  it('menyembunyikan tautan yang belum punya gambar sama sekali', async () => {
    await dalamTransaksi(async (db) => {
      const konteks = await siapkanData(db);

      await db.insert(socialLink).values({
        platform: 'instagram',
        url: 'https://www.instagram.com/p/tanpa-gambar/',
        sortOrder: 0,
        isVisible: true,
        createdBy: konteks.penulisId,
      });

      const hasil = await repositoryOf(db).findVisible(8);

      expect(hasil.some((row) => row.url.includes('tanpa-gambar'))).toBe(false);
    });
  });

  it('mengurutkan daftar admin dan menyertakan tautan tersembunyi', async () => {
    await dalamTransaksi(async (db) => {
      await siapkanData(db);

      const hasil = await repositoryOf(db).findMany();

      expect(hasil).toHaveLength(3);
      expect(hasil.map((row) => row.sortOrder)).toEqual([0, 1, 2]);
    });
  });

  it('memberi urutan berikutnya dari nilai terbesar', async () => {
    await dalamTransaksi(async (db) => {
      await siapkanData(db);

      await expect(repositoryOf(db).nextSortOrder(db)).resolves.toBe(3);
    });
  });

  it('menghitung waktu ubah terakhir untuk ETag', async () => {
    await dalamTransaksi(async (db) => {
      await siapkanData(db);

      await expect(repositoryOf(db).latestUpdatedAt()).resolves.toBeDefined();
    });
  });

  it('mengembalikan undefined saat tabel masih kosong', async () => {
    await expect(repositoryOf(root).latestUpdatedAt()).resolves.toBeUndefined();
  });

  it('menemukan gambar galeri yang sah dan menolak id asing', async () => {
    await dalamTransaksi(async (db) => {
      const konteks = await siapkanData(db);

      await expect(repositoryOf(db).findGalleryImage(db, konteks.fotoId)).resolves.toBeDefined();
      await expect(
        repositoryOf(db).findGalleryImage(db, '00000000-0000-4000-8000-000000000000'),
      ).resolves.toBeUndefined();
    });
  });
});
