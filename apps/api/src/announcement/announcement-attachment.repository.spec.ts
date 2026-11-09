import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { DatabaseService } from '../db/database.service.js';
import { migrationBodies } from '../db/migration-catalog.js';
import * as schema from '../db/schema/index.js';
import { adminUser } from '../db/schema/admin-user.js';
import { announcementAttachment } from '../db/schema/announcement-attachment.js';
import { announcement } from '../db/schema/announcement.js';
import { AnnouncementAdminRepository } from './announcement-admin.repository.js';
import { AnnouncementAttachmentRepository } from './announcement-attachment.repository.js';

const DATABASE_URL = process.env['DATABASE_URL'];

const ROLLBACK: unique symbol = Symbol('rollback');

const AUTHOR_HASH = '$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA';

const SKEMA = `test_${randomBytes(6).toString('hex')}`;

type Klien = ReturnType<typeof postgres>;

type Database = PostgresJsDatabase<typeof schema>;

let admin: Klien;

let client: Klien;

let root: Database;

function repositoryOf(db: Database): AnnouncementAttachmentRepository {
  return new AnnouncementAttachmentRepository({ db } as unknown as DatabaseService);
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

async function siapkanPengumuman(db: Database): Promise<{ penulisId: string; id: string }> {
  const [penulis] = await db
    .insert(adminUser)
    .values({ username: `uji-${Date.now()}`, displayName: 'Uji', passwordHash: AUTHOR_HASH })
    .returning({ id: adminUser.id });

  if (penulis === undefined) {
    throw new Error('Gagal membuat pengguna uji');
  }

  const [baris] = await db
    .insert(announcement)
    .values({
      slug: 'pensi-sekolah',
      title: 'Pensi Sekolah',
      excerpt: 'Pensi tahunan kelas.',
      body: 'Isi pengumuman pensi.',
      category: 'kegiatan',
      status: 'published',
      authorId: penulis.id,
      publishedAt: '2026-10-01T02:00:00Z',
    })
    .returning({ id: announcement.id });

  if (baris === undefined) {
    throw new Error('Gagal membuat pengumuman uji');
  }

  return { penulisId: penulis.id, id: baris.id };
}

const FOTO = {
  kind: 'image',
  storageKey: 'album/foto.webp',
  fileName: 'poster.webp',
  mimeType: 'image/webp',
  byteSize: 1000,
  width: 1024,
  height: 768,
};

const BERKAS = {
  kind: 'file',
  storageKey: 'album/surat.pdf',
  fileName: 'surat-edaran.pdf',
  mimeType: 'application/pdf',
  byteSize: 2000,
  width: null,
  height: null,
};

describe.skipIf(DATABASE_URL === undefined)(
  'AnnouncementAttachmentRepository dengan basis data nyata',
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

    it('mengembalikan daftar kosong saat pengumuman belum punya lampiran', async () => {
      await dalamTransaksi(async (db) => {
        const { id } = await siapkanPengumuman(db);

        await expect(repositoryOf(db).findMany(db, id)).resolves.toEqual([]);
      });
    });

    it('menyimpan lampiran gambar dan berkas dengan bentuk yang berbeda', async () => {
      await dalamTransaksi(async (db) => {
        const { penulisId, id } = await siapkanPengumuman(db);

        await repositoryOf(db).insert(db, { ...FOTO, announcementId: id, createdBy: penulisId });
        await repositoryOf(db).insert(db, { ...BERKAS, announcementId: id, createdBy: penulisId });

        const hasil = await repositoryOf(db).findMany(db, id);

        expect(hasil).toHaveLength(2);
        expect(hasil.map((row) => row.kind).sort()).toEqual(['file', 'image']);
      });
    });

    it('menolak gambar tanpa dimensi', async () => {
      await dalamTransaksi(async (db) => {
        const { penulisId, id } = await siapkanPengumuman(db);

        await expect(
          repositoryOf(db).insert(db, {
            ...FOTO,
            width: null,
            announcementId: id,
            createdBy: penulisId,
          }),
        ).rejects.toThrow();
      });
    });

    it('menolak berkas dengan mime di luar PDF', async () => {
      await dalamTransaksi(async (db) => {
        const { penulisId, id } = await siapkanPengumuman(db);

        await expect(
          repositoryOf(db).insert(db, {
            ...BERKAS,
            mimeType: 'text/html',
            announcementId: id,
            createdBy: penulisId,
          }),
        ).rejects.toThrow();
      });
    });

    it('menolak berkas melebihi lima megabita', async () => {
      await dalamTransaksi(async (db) => {
        const { penulisId, id } = await siapkanPengumuman(db);

        await expect(
          repositoryOf(db).insert(db, {
            ...BERKAS,
            byteSize: 5 * 1024 * 1024 + 1,
            announcementId: id,
            createdBy: penulisId,
          }),
        ).rejects.toThrow();
      });
    });

    it('memberi urutan berikutnya dan mengurutkan sesuai posisi', async () => {
      await dalamTransaksi(async (db) => {
        const { penulisId, id } = await siapkanPengumuman(db);
        const [satu, dua] = await db
          .insert(announcementAttachment)
          .values([
            { ...FOTO, announcementId: id, createdBy: penulisId, sortOrder: 0 },
            { ...BERKAS, announcementId: id, createdBy: penulisId, sortOrder: 1 },
          ])
          .returning({ id: announcementAttachment.id });

        expect(await repositoryOf(db).nextSortOrder(db, id)).toBe(2);

        const ids = [dua?.id ?? '', satu?.id ?? ''];
        await repositoryOf(db).applyOrder(db, id, ids);

        const hasil = await repositoryOf(db).findMany(db, id);
        expect(hasil.map((row) => row.id)).toEqual(ids);
      });
    });

    it('menghapus lampiran hanya dari pengumuman yang disebut', async () => {
      await dalamTransaksi(async (db) => {
        const { penulisId, id } = await siapkanPengumuman(db);
        const [baris] = await db
          .insert(announcementAttachment)
          .values({ ...FOTO, announcementId: id, createdBy: penulisId, sortOrder: 0 })
          .returning({ id: announcementAttachment.id });

        const salah = await repositoryOf(db).remove(
          db,
          '00000000-0000-4000-8000-000000000000',
          baris?.id ?? '',
        );

        expect(salah).toBeUndefined();

        const benar = await repositoryOf(db).remove(db, id, baris?.id ?? '');
        expect(benar?.id).toBe(baris?.id);
      });
    });

    it('menghapus lampiran otomatis saat pengumuman dihapus', async () => {
      await dalamTransaksi(async (db) => {
        const { penulisId, id } = await siapkanPengumuman(db);

        await repositoryOf(db).insert(db, { ...FOTO, announcementId: id, createdBy: penulisId });
        await db.delete(announcement);

        await expect(repositoryOf(db).findMany(db, id)).resolves.toEqual([]);
      });
    });

    it('menghitung lampiran per pengumuman', async () => {
      await dalamTransaksi(async (db) => {
        const { penulisId, id } = await siapkanPengumuman(db);

        await repositoryOf(db).insert(db, { ...FOTO, announcementId: id, createdBy: penulisId });

        await expect(repositoryOf(db).countOf(db, id)).resolves.toBe(1);
      });
    });

    it('menyematkan pengumuman paling atas pada daftar publik', async () => {
      await dalamTransaksi(async (db) => {
        const { penulisId, id } = await siapkanPengumuman(db);

        await db.insert(announcement).values([
          {
            slug: 'lebih-baru',
            title: 'Lebih Baru',
            excerpt: 'Terbit lebih baru.',
            body: 'Isi.',
            category: 'umum',
            status: 'published',
            authorId: penulisId,
            publishedAt: '2026-10-05T02:00:00Z',
          },
        ]);

        const adminRepo = new AnnouncementAdminRepository({
          db,
        } as unknown as DatabaseService);

        await adminRepo.update(db as never, id, undefined, {
          isPinned: true,
          pinnedAt: '2026-10-06T02:00:00Z',
        });

        const baris = await repositoryOf(db).findMany(db, id);
        expect(baris).toHaveLength(0);

        await expect(adminRepo.countPinned(db)).resolves.toBe(1);
      });
    });
  },
);
