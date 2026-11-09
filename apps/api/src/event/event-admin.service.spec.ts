import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { SessionContext } from '../auth/auth.service.js';
import type { RequestContext } from '../common/http/request-context.js';
import type { DatabaseService } from '../db/database.service.js';
import { EventAdminRepository } from './event-admin.repository.js';
import type { EventImageRepository } from './event-image.repository.js';
import type { EventAdminListRow, EventAdminRow } from './event-admin.repository.js';
import { EventAdminService } from './event-admin.service.js';

const ID = '11111111-1111-4111-8111-111111111111';

const WAKTU = '2026-12-01 09:00:00+00';

const SELESAI = '2026-12-01 11:00:00+00';

const MULAI_ISO = '2026-12-01T09:00:00.000Z';

const SELESAI_ISO = '2026-12-01T11:00:00.000Z';

const AKTOR: SessionContext = {
  sessionId: '22222222-2222-4222-8222-222222222222',
  userId: '33333333-3333-4333-8333-333333333333',
  username: 'budi',
  displayName: 'Budi Santoso',
  role: 'admin',
  expiresAt: '2026-12-01T12:00:00.000Z',
};

const KONTEKS: RequestContext = {
  ipHash: 'f'.repeat(64),
  userAgent: 'vitest',
  correlationId: 'abc12345',
};

const UNIQUE = Object.assign(new Error('duplikat'), { code: '23505' });

function listRowOf(overrides: Partial<EventAdminListRow> = {}): EventAdminListRow {
  return {
    id: ID,
    slug: 'pensi-sekolah',
    title: 'Pensi Sekolah',
    location: 'Aula',
    startsAt: WAKTU,
    endsAt: SELESAI,
    status: 'draft',
    authorName: 'Budi Santoso',
    version: 1,
    createdAt: WAKTU,
    updatedAt: WAKTU,
    ...overrides,
  };
}

function detailRowOf(overrides: Partial<EventAdminRow> = {}): EventAdminRow {
  return { ...listRowOf(), description: 'Dokumentasi pensi.', ...overrides };
}

type Opsi = {
  halaman?: { rows: EventAdminListRow[]; total: number };
  baris?: EventAdminRow | null;
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
  const database = { db: { transaction: (run: (scope: unknown) => Promise<unknown>) => run(tx) } };

  const images = {
    findPhotos: vi.fn().mockResolvedValue([]),
    countPhotos: vi.fn().mockResolvedValue(new Map<string, number>()),
    replaceAll: vi.fn().mockResolvedValue(undefined),
    findKnownAlbumImages: vi.fn().mockResolvedValue(new Set<string>()),
  };

  const service = new EventAdminService(
    repository as unknown as EventAdminRepository,
    images as unknown as EventImageRepository,
    audit as unknown as AuditRepository,
    database as unknown as DatabaseService,
  );

  return { service, repository, images, audit, tx };
}

describe('EventAdminService.list', () => {
  it('memetakan baris menjadi daftar tanpa deskripsi', () => {
    const { service } = buatService({ halaman: { rows: [listRowOf()], total: 3 } });

    return service.list({ page: 1, perPage: 20 }).then((hasil) => {
      expect(hasil.meta).toEqual({ page: 1, perPage: 20, total: 3, totalPages: 1 });
      expect(hasil.items).toEqual([
        {
          id: ID,
          slug: 'pensi-sekolah',
          title: 'Pensi Sekolah',
          location: 'Aula',
    photoCount: 0,
          startsAt: MULAI_ISO,
          endsAt: SELESAI_ISO,
          status: 'draft',
          authorName: 'Budi Santoso',
          version: 1,
          createdAt: MULAI_ISO,
          updatedAt: MULAI_ISO,
        },
      ]);
      expect(hasil.items[0]).not.toHaveProperty('description');
    });
  });

  it('meneruskan filter status ke repository', async () => {
    const { service, repository } = buatService();

    await service.list({ page: 2, perPage: 50, status: 'archived' });

    expect(repository.findPage).toHaveBeenCalledWith({
      page: 2,
      perPage: 50,
      status: 'archived',
    });
  });
});

describe('EventAdminService.detail', () => {
  it('mengembalikan deskripsi lengkap dan versi', async () => {
    const { service } = buatService();

    const hasil = await service.detail(ID);

    expect(hasil.description).toBe('Dokumentasi pensi.');
    expect(hasil.version).toBe(1);
  });

  it('melempar 404 ketika kegiatan tidak ada', async () => {
    const { service } = buatService({ baris: null });

    await expect(service.detail(ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('EventAdminService.create', () => {
  it('membuat draf dengan slug turunan judul dan penulis dari sesi', async () => {
    const { service, repository, audit, tx } = buatService();

    await service.create(
      { title: 'Pensi Sekolah 2026', startsAt: MULAI_ISO, endsAt: SELESAI_ISO },
      AKTOR,
      KONTEKS,
    );

    expect(repository.insert).toHaveBeenCalledWith(tx, {
      slug: 'pensi-sekolah-2026',
      title: 'Pensi Sekolah 2026',
      description: null,
      location: null,
      startsAt: MULAI_ISO,
      endsAt: SELESAI_ISO,
      status: 'draft',
      createdBy: AKTOR.userId,
    });
    expect(audit.recordWithin).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'create', entityType: 'event', entityId: ID }),
    );
  });

  it('menyimpan waktu selesai sebagai null ketika tidak dikirim', async () => {
    const { service, repository } = buatService();

    await service.create({ title: 'Rapat Wali', startsAt: MULAI_ISO }, AKTOR, KONTEKS);

    expect(repository.insert).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ endsAt: null }),
    );
  });

  it('menolak waktu selesai sebelum waktu mulai', async () => {
    const { service, repository } = buatService();

    await expect(
      service.create(
        { title: 'Rapat Wali', startsAt: MULAI_ISO, endsAt: '2026-12-01T08:00:00.000Z' },
        AKTOR,
        KONTEKS,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it('menormalkan waktu ke UTC sebelum disimpan', async () => {
    const { service, repository } = buatService();

    await service.create(
      { title: 'Rapat Wali', startsAt: '2026-12-01T16:00:00+07:00' },
      AKTOR,
      KONTEKS,
    );

    expect(repository.insert).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ startsAt: '2026-12-01T09:00:00.000Z' }),
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

    await service.create({ title: 'Pensi Sekolah', startsAt: MULAI_ISO }, AKTOR, KONTEKS);

    expect(repository.insert.mock.calls.map((call) => (call[1] as { slug: string }).slug)).toEqual([
      'pensi-sekolah',
      'pensi-sekolah-2',
      'pensi-sekolah-3',
    ]);
  });

  it('menyerah dengan 409 setelah seluruh kandidat slug dipakai', async () => {
    const { service, repository } = buatService();

    repository.insert.mockRejectedValue(UNIQUE);

    await expect(
      service.create({ title: 'Pensi Sekolah', startsAt: MULAI_ISO }, AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.insert).toHaveBeenCalledTimes(5);
  });
});

describe('EventAdminService.update', () => {
  it('memvalidasi jadwal gabungan ketika hanya waktu mulai yang diubah', async () => {
    const { service, repository } = buatService();

    await expect(
      service.update(ID, { startsAt: '2026-12-01T12:00:00.000Z' }, AKTOR, KONTEKS, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('memvalidasi jadwal gabungan ketika hanya waktu selesai yang diubah', async () => {
    const { service, repository } = buatService();

    await expect(
      service.update(ID, { endsAt: '2026-12-01T08:00:00.000Z' }, AKTOR, KONTEKS, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('mengizinkan memperpanjang waktu selesai tanpa menyentuh waktu mulai', async () => {
    const { service, repository } = buatService();

    await service.update(ID, { endsAt: '2026-12-01T13:00:00.000Z' }, AKTOR, KONTEKS, undefined);

    expect(repository.update).toHaveBeenCalledWith(
      expect.anything(),
      ID,
      undefined,
      expect.objectContaining({ endsAt: '2026-12-01T13:00:00.000Z' }),
    );
  });

  it('mengizinkan menghapus waktu selesai dengan null eksplisit', async () => {
    const { service, repository } = buatService();

    await service.update(ID, { endsAt: null }, AKTOR, KONTEKS, undefined);

    expect(repository.update).toHaveBeenCalledWith(
      expect.anything(),
      ID,
      undefined,
      expect.objectContaining({ endsAt: null }),
    );
  });

  it('membuat redirect ketika judul berubah dan slug ikut berubah', async () => {
    const { service, repository, tx } = buatService();

    await service.update(ID, { title: 'Pensi Baru' }, AKTOR, KONTEKS, undefined);

    expect(repository.update).toHaveBeenCalledWith(
      expect.anything(),
      ID,
      undefined,
      expect.objectContaining({ slug: 'pensi-baru' }),
    );
    expect(repository.recordRedirect).toHaveBeenCalledWith(tx, 'pensi-sekolah', ID);
    expect(repository.dropRedirect).toHaveBeenCalledWith(tx, 'pensi-baru');
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

  it('melempar 409 ketika versi klien sudah usang, tanpa menulis audit', async () => {
    const { service, repository, audit } = buatService();

    repository.update.mockResolvedValue(undefined);

    await expect(
      service.update(ID, { title: 'Pensi Baru' }, AKTOR, KONTEKS, 1),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(audit.recordWithin).not.toHaveBeenCalled();
  });

  it('melempar 404 ketika kegiatan tidak ada', async () => {
    const { service } = buatService({ baris: null });

    await expect(
      service.update(ID, { title: 'Pensi Baru' }, AKTOR, KONTEKS, undefined),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('EventAdminService transisi status', () => {
  it('menerbitkan draf', async () => {
    const { service, repository, audit, tx } = buatService();

    await service.publish(ID, AKTOR, KONTEKS, undefined);

    expect(repository.update).toHaveBeenCalledWith(
      tx,
      ID,
      undefined,
      expect.objectContaining({ status: 'published' }),
    );
    expect(audit.recordWithin).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'publish' }),
    );
  });

  it('menolak menerbitkan kegiatan yang sudah terbit', async () => {
    const { service } = buatService({ baris: detailRowOf({ status: 'published' }) });

    await expect(service.publish(ID, AKTOR, KONTEKS, undefined)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('mengarsipkan kegiatan terbit', async () => {
    const { service, repository } = buatService({ baris: detailRowOf({ status: 'published' }) });

    await service.archive(ID, AKTOR, KONTEKS, undefined);

    expect(repository.update).toHaveBeenCalledWith(
      expect.anything(),
      ID,
      undefined,
      expect.objectContaining({ status: 'archived' }),
    );
  });

  it('menolak mengarsipkan kegiatan draf', async () => {
    const { service, repository } = buatService();

    await expect(service.archive(ID, AKTOR, KONTEKS, undefined)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('memulihkan kegiatan arsip menjadi draf', async () => {
    const { service, repository, audit } = buatService({ baris: detailRowOf({ status: 'archived' }) });

    await service.restore(ID, AKTOR, KONTEKS, undefined);

    expect(repository.update).toHaveBeenCalledWith(
      expect.anything(),
      ID,
      undefined,
      expect.objectContaining({ status: 'draft' }),
    );
    expect(audit.recordWithin).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'restore', entityType: 'event' }),
    );
  });

  it('menolak transisi ketika versi klien sudah usang', async () => {
    const { service, repository } = buatService();

    repository.update.mockResolvedValue(undefined);

    await expect(service.publish(ID, AKTOR, KONTEKS, 4)).rejects.toBeInstanceOf(ConflictException);
  });
});
