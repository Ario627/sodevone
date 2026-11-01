import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { RequestContext } from '../common/http/request-context.js';
import type { SessionContext } from '../auth/auth.service.js';
import type { DatabaseService } from '../db/database.service.js';
import type {
  AnnouncementAdminDetailRow,
  AnnouncementAdminListRow,
} from './announcement-admin.repository.js';
import { AnnouncementAdminRepository } from './announcement-admin.repository.js';
import { AnnouncementAdminService } from './announcement-admin.service.js';

const ID = '11111111-1111-4111-8111-111111111111';

const AKTOR: SessionContext = {
  sessionId: '22222222-2222-4222-8222-222222222222',
  userId: '33333333-3333-4333-8333-333333333333',
  username: 'budi',
  displayName: 'Budi Santoso',
  role: 'admin',
  expiresAt: '2026-11-01T12:00:00.000Z',
};

const KONTEKS: RequestContext = {
  ipHash: 'd'.repeat(64),
  userAgent: 'vitest',
  correlationId: 'abc12345',
};

const WAKTU = '2026-11-01 02:00:00+00';

function listRowOf(overrides: Partial<AnnouncementAdminListRow> = {}): AnnouncementAdminListRow {
  return {
    id: ID,
    slug: 'pensi-sekolah',
    title: 'Pensi Sekolah',
    excerpt: 'Pensi tahunan.',
    category: 'kegiatan',
    status: 'draft',
    authorId: AKTOR.userId,
    authorName: 'Budi Santoso',
    version: 1,
    publishedAt: null,
    createdAt: WAKTU,
    updatedAt: WAKTU,
    ...overrides,
  };
}

function detailRowOf(
  overrides: Partial<AnnouncementAdminDetailRow> = {},
): AnnouncementAdminDetailRow {
  return { ...listRowOf(), body: 'Isi **pengumuman** kelas.', ...overrides };
}

const UNIQUE = Object.assign(new Error('duplikat'), { code: '23505' });

type Opsi = {
  halaman?: { rows: AnnouncementAdminListRow[]; total: number };
  baris?: AnnouncementAdminDetailRow | null;
};

function buatService(opsi: Opsi = {}) {
  const baris = opsi.baris === null ? undefined : (opsi.baris ?? detailRowOf());
  const repository = {
    findPage: vi.fn().mockResolvedValue(opsi.halaman ?? { rows: [], total: 0 }),
    findById: vi.fn().mockResolvedValue(baris),
    insert: vi.fn().mockResolvedValue({ id: ID }),
    update: vi.fn().mockResolvedValue({ id: ID }),
    recordRedirect: vi.fn().mockResolvedValue(undefined),
    dropRedirect: vi.fn().mockResolvedValue(undefined),
  };
  const audit = { record: vi.fn(), recordWithin: vi.fn().mockResolvedValue(undefined) };
  const tx = { name: 'tx' };
  const database = {
    db: { transaction: (run: (scope: unknown) => Promise<unknown>) => run(tx) },
  };

  const service = new AnnouncementAdminService(
    repository as unknown as AnnouncementAdminRepository,
    audit as unknown as AuditRepository,
    database as unknown as DatabaseService,
  );

  return { service, repository, audit, tx };
}

describe('AnnouncementAdminService.list', () => {
  it('meneruskan filter dan menghitung total halaman', async () => {
    const { service, repository } = buatService({
      halaman: { rows: [listRowOf()], total: 41 },
    });

    const hasil = await service.list({ page: 3, perPage: 20, status: 'draft', q: 'pensi' });

    expect(repository.findPage).toHaveBeenCalledWith({
      page: 3,
      perPage: 20,
      status: 'draft',
      category: undefined,
      search: 'pensi',
    });
    expect(hasil.meta).toEqual({ page: 3, perPage: 20, total: 41, totalPages: 3 });
    expect(hasil.items[0]).not.toHaveProperty('body');
  });
});

describe('AnnouncementAdminService.detail', () => {
  it('mengembalikan detail dengan HTML hasil render', async () => {
    const { service } = buatService();

    const hasil = await service.detail(ID);

    expect(hasil.bodyHtml).toContain('<strong>pengumuman</strong>');
    expect(hasil.version).toBe(1);
  });

  it('melempar 404 ketika pengumuman tidak ada', async () => {
    const { service } = buatService({ baris: null });

    await expect(service.detail(ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AnnouncementAdminService.create', () => {
  it('membuat draf dengan slug dan ringkasan turunan dari judul dan isi', async () => {
    const { service, repository, audit, tx } = buatService();

    await service.create(
      { title: 'Pensi Sekolah 2026', body: 'Pensi **tahunan** digelar Desember.' },
      AKTOR,
      KONTEKS,
    );

    expect(repository.insert).toHaveBeenCalledWith(tx, {
      title: 'Pensi Sekolah 2026',
      body: 'Pensi **tahunan** digelar Desember.',
      excerpt: 'Pensi tahunan digelar Desember.',
      category: 'umum',
      slug: 'pensi-sekolah-2026',
      status: 'draft',
      authorId: AKTOR.userId,
    });
    expect(audit.recordWithin).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'create',
        entityType: 'announcement',
        entityId: ID,
        actorId: AKTOR.userId,
        actorLabel: 'budi',
        ipHash: KONTEKS.ipHash,
        correlationId: 'abc12345',
      }),
    );
  });

  it('memakai slug dan ringkasan yang dikirim klien', async () => {
    const { service, repository } = buatService();

    await service.create(
      { title: 'Judul Apa Saja', body: 'Isi.', slug: 'slug-pilihan', excerpt: 'Ringkas.' },
      AKTOR,
      KONTEKS,
    );

    expect(repository.insert).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ slug: 'slug-pilihan', excerpt: 'Ringkas.' }),
    );
  });

  it('mencoba slug berakhiran angka ketika slug dasar sudah dipakai', async () => {
    let percobaan = 0;
    const { service, repository } = buatService();

    repository.insert.mockImplementation(async () => {
      percobaan += 1;

      if (percobaan < 3) {
        throw UNIQUE;
      }

      return { id: ID };
    });

    await service.create({ title: 'Pensi Sekolah', body: 'Isi.' }, AKTOR, KONTEKS);

    const slugDipakai = repository.insert.mock.calls.map(
      (call) => (call[1] as { slug: string }).slug,
    );

    expect(slugDipakai).toEqual(['pensi-sekolah', 'pensi-sekolah-2', 'pensi-sekolah-3']);
  });

  it('menyerah dengan 409 setelah seluruh kandidat slug dipakai', async () => {
    const { service, repository } = buatService();

    repository.insert.mockRejectedValue(UNIQUE);

    await expect(
      service.create({ title: 'Pensi Sekolah', body: 'Isi.' }, AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.insert).toHaveBeenCalledTimes(5);
  });

  it('meneruskan galat yang bukan pelanggaran keunikan', async () => {
    const { service, repository } = buatService();

    repository.insert.mockRejectedValue(new Error('koneksi putus'));

    await expect(
      service.create({ title: 'Pensi', body: 'Isi.' }, AKTOR, KONTEKS),
    ).rejects.toThrow('koneksi putus');
  });
});

describe('AnnouncementAdminService.update', () => {
  it('menyimpan perubahan dan menaikkan versi lewat repository', async () => {
    const { service, repository, audit, tx } = buatService();

    await service.update(ID, { title: 'Judul Baru' }, AKTOR, KONTEKS, 1);

    expect(repository.update).toHaveBeenCalledWith(
      tx,
      ID,
      1,
      expect.objectContaining({ title: 'Judul Baru', slug: 'judul-baru' }),
    );
    expect(repository.recordRedirect).toHaveBeenCalledWith(tx, 'pensi-sekolah', ID);
    expect(repository.dropRedirect).toHaveBeenCalledWith(tx, 'judul-baru');
    expect(audit.recordWithin).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'update', entityId: ID }),
    );
  });

  it('menurunkan ringkasan baru ketika isi berubah tanpa ringkasan eksplisit', async () => {
    const { service, repository } = buatService();

    await service.update(ID, { body: 'Kalimat **baru** untuk kelas.' }, AKTOR, KONTEKS, undefined);

    expect(repository.update).toHaveBeenCalledWith(
      expect.anything(),
      ID,
      undefined,
      expect.objectContaining({ excerpt: 'Kalimat baru untuk kelas.' }),
    );
  });

  it('tidak membuat redirect ketika slug tidak berubah', async () => {
    const { service, repository } = buatService();

    await service.update(ID, { title: 'Pensi Sekolah' }, AKTOR, KONTEKS, undefined);

    expect(repository.update).toHaveBeenCalledWith(
      expect.anything(),
      ID,
      undefined,
      expect.not.objectContaining({ slug: expect.anything() }),
    );
    expect(repository.recordRedirect).not.toHaveBeenCalled();
  });

  it('melempar 409 ketika versi sudah berubah, tanpa menulis audit', async () => {
    const { service, repository, audit } = buatService();

    repository.update.mockResolvedValue(undefined);

    await expect(
      service.update(ID, { title: 'Judul Baru' }, AKTOR, KONTEKS, 1),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(audit.recordWithin).not.toHaveBeenCalled();
  });

  it('melempar 404 ketika pengumuman tidak ada', async () => {
    const { service } = buatService({ baris: null });

    await expect(
      service.update(ID, { title: 'Judul Baru' }, AKTOR, KONTEKS, undefined),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AnnouncementAdminService transisi status', () => {
  it('menerbitkan draf dan mengisi waktu terbit', async () => {
    const { service, repository, audit, tx } = buatService();

    await service.publish(ID, AKTOR, KONTEKS, undefined);

    expect(repository.update).toHaveBeenCalledWith(
      tx,
      ID,
      undefined,
      expect.objectContaining({ status: 'published', publishedAt: expect.any(String) }),
    );
    expect(audit.recordWithin).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'publish' }),
    );
  });

  it('mengarsipkan pengumuman terbit tanpa menghapus waktu terbit', async () => {
    const { service, repository } = buatService({
      baris: detailRowOf({ status: 'published', publishedAt: WAKTU }),
    });

    await service.archive(ID, AKTOR, KONTEKS, undefined);

    expect(repository.update).toHaveBeenCalledWith(
      expect.anything(),
      ID,
      undefined,
      expect.not.objectContaining({ publishedAt: expect.anything() }),
    );
  });

  it('memulihkan arsip menjadi draf tanpa mengisi waktu terbit', async () => {
    const { service, repository } = buatService({
      baris: detailRowOf({ status: 'archived', publishedAt: WAKTU }),
    });

    await service.restore(ID, AKTOR, KONTEKS, undefined);

    expect(repository.update).toHaveBeenCalledWith(
      expect.anything(),
      ID,
      undefined,
      expect.objectContaining({ status: 'draft' }),
    );
  });

  it('menarik pengumuman terbit menjadi draf', async () => {
    const { service, audit } = buatService({
      baris: detailRowOf({ status: 'published', publishedAt: WAKTU }),
    });

    await service.unpublish(ID, AKTOR, KONTEKS, undefined);

    expect(audit.recordWithin).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'unpublish' }),
    );
  });

  it('menolak arsip yang langsung diterbitkan', async () => {
    const { service, repository } = buatService({
      baris: detailRowOf({ status: 'archived', publishedAt: WAKTU }),
    });

    await expect(service.publish(ID, AKTOR, KONTEKS, undefined)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('menolak penerbitan ketika versi klien sudah usang', async () => {
    const { service, repository } = buatService();

    repository.update.mockResolvedValue(undefined);

    await expect(service.publish(ID, AKTOR, KONTEKS, 7)).rejects.toBeInstanceOf(ConflictException);
  });
});