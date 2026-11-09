import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { DatabaseService } from '../db/database.service.js';
import { migrationBodies } from '../db/migration-catalog.js';
import * as schema from '../db/schema/index.js';
import { ClassMemberRepository } from './class-member.repository.js';

const DATABASE_URL = process.env['DATABASE_URL'];

const ROLLBACK: unique symbol = Symbol('rollback');

const SKEMA = `test_${randomBytes(6).toString('hex')}`;

type Klien = ReturnType<typeof postgres>;

type Database = PostgresJsDatabase<typeof schema>;

let admin: Klien;

let client: Klien;

let root: Database;

function repositoryOf(db: Database): ClassMemberRepository {
  return new ClassMemberRepository({ db } as unknown as DatabaseService);
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

const SISWA_A = {
  role: 'student',
  fullName: 'Aditya Pranawa',
  nickname: 'Adit',
  hobby: 'menyusun playlist',
  note: 'Kalau ada bug, dia yang pertama bilang coba restart.',
  isPublished: true,
};

const SISWA_B = {
  role: 'student',
  fullName: 'Bunga Larasati',
  nickname: 'Bunga',
  hobby: 'fotografi',
  note: 'Memotret apa saja, termasuk galat di papan tulis.',
  isPublished: false,
};

const WALI = {
  role: 'homeroom',
  fullName: 'Ratna Kusumaningrum',
  nickname: 'Bu Ratna',
  hobby: 'menyusun jadwal',
  note: 'Selalu ingat siapa yang belum mengumpulkan.',
  isPublished: true,
};

const BARIS = [SISWA_A, SISWA_B, WALI].map((row, index) => ({ ...row, sortOrder: index }));

describe.skipIf(DATABASE_URL === undefined)('ClassMemberRepository dengan basis data nyata', () => {
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

  it('mengembalikan daftar kosong saat tabel belum diisi', async () => {
    await expect(repositoryOf(root).findPublished()).resolves.toEqual([]);
  });

  it('melaporkan cap waktu kosong saat tabel belum diisi', async () => {
    await expect(repositoryOf(root).fingerprint()).resolves.toEqual({
      count: 0,
      latest: undefined,
    });
  });

  it('hanya mendaftar anggota yang ditampilkan dan menjaga urutan', async () => {
    await dalamTransaksi(async (db) => {
      await repositoryOf(db).replaceAll(db, BARIS);

      const hasil = await repositoryOf(db).findPublished();

      expect(hasil.map((row) => row.nickname)).toEqual(['Adit', 'Bu Ratna']);
    });
  });

  it('mengganti seluruh isi tabel dalam satu panggilan', async () => {
    await dalamTransaksi(async (db) => {
      await repositoryOf(db).replaceAll(db, [{ ...SISWA_A, sortOrder: 0 }]);
      await repositoryOf(db).replaceAll(db, [{ ...WALI, sortOrder: 0 }]);

      const hasil = await repositoryOf(db).findMany();

      expect(hasil).toHaveLength(1);
      expect(hasil[0]?.role).toBe('homeroom');
    });
  });

  it('mengosongkan tabel ketika daftar yang dikirim kosong', async () => {
    await dalamTransaksi(async (db) => {
      await repositoryOf(db).replaceAll(db, [{ ...SISWA_A, sortOrder: 0 }]);
      await repositoryOf(db).replaceAll(db, []);

      await expect(repositoryOf(db).findMany()).resolves.toEqual([]);
    });
  });

  it('menghitung hanya anggota tampil pada cap waktu', async () => {
    await dalamTransaksi(async (db) => {
      await repositoryOf(db).replaceAll(db, BARIS);

      const hasil = await repositoryOf(db).fingerprint();

      expect(hasil.count).toBe(2);
      expect(typeof hasil.latest).toBe('string');
    });
  });

  it('menolak peran di luar daftar yang diizinkan', async () => {
    await dalamTransaksi(async (db) => {
      await expect(
        repositoryOf(db).replaceAll(db, [{ ...SISWA_A, role: 'guru', sortOrder: 0 }]),
      ).rejects.toThrow();
    });
  });

  it('menolak catatan yang terlalu pendek', async () => {
    await dalamTransaksi(async (db) => {
      await expect(
        repositoryOf(db).replaceAll(db, [{ ...SISWA_A, note: ' ', sortOrder: 0 }]),
      ).rejects.toThrow();
    });
  });
});
