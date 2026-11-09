import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '../common/http/request-context.js';
import type { SessionContext } from '../auth/auth.service.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { DatabaseService } from '../db/database.service.js';
import type {
  AnnouncementAdminDetailRow,
  AnnouncementAdminListRow,
  AnnouncementAdminRepository,
} from './announcement-admin.repository.js';
import type { AnnouncementAttachmentRepository } from './announcement-attachment.repository.js';
import { AnnouncementAdminService } from './announcement-admin.service.js';

const ID = '11111111-1111-4111-8111-111111111111';

const AKTOR: SessionContext = {
  sessionId: 's-1',
  userId: '22222222-2222-4222-8222-222222222222',
  username: 'budi',
  displayName: 'Budi Santoso',
  role: 'admin',
  expiresAt: '2026-11-01T12:00:00.000Z',
} as SessionContext;

const KONTEKS: RequestContext = {
  ipHash: 'd'.repeat(64),
  userAgent: 'vitest',
  correlationId: 'abc12345',
};

const WAKTU = '2026-11-01 02:00:00+00';

function rowOf(patch: Partial<AnnouncementAdminDetailRow> = {}): AnnouncementAdminDetailRow {
  const base: AnnouncementAdminListRow = {
    id: ID,
    slug: 'pensi-sekolah',
    title: 'Pensi Sekolah',
    excerpt: 'Pensi tahunan.',
    category: 'kegiatan',
    status: 'published',
    isPinned: false,
    authorId: AKTOR.userId,
    authorName: 'Budi Santoso',
    version: 1,
    publishedAt: WAKTU,
    createdAt: WAKTU,
    updatedAt: WAKTU,
  };

  return { ...base, body: 'Isi **pensi**.', ...patch };
}

type Opsi = {
  baris?: AnnouncementAdminDetailRow | null;
  pinnedCount?: number;
};

function buatService(opsi: Opsi = {}) {
  let current = opsi.baris === null ? undefined : (opsi.baris ?? rowOf());

  const repository = {
    findById: vi.fn().mockImplementation(async () => current),
    countPinned: vi.fn().mockResolvedValue(opsi.pinnedCount ?? 0),
    update: vi.fn().mockImplementation(async (_tx, _id, _version, patch) => {
      current = { ...(current as AnnouncementAdminDetailRow), ...patch };
      (current as AnnouncementAdminDetailRow).version += 1;

      return { id: ID };
    }),
    insert: vi.fn().mockResolvedValue({ id: ID }),
    findPage: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    recordRedirect: vi.fn(),
    dropRedirect: vi.fn(),
  };

  const attachments = {
    findMany: vi.fn().mockResolvedValue([]),
    countOf: vi.fn().mockResolvedValue(0),
    nextSortOrder: vi.fn().mockResolvedValue(0),
    insert: vi.fn(),
    remove: vi.fn(),
    findOne: vi.fn(),
    applyOrder: vi.fn(),
  };

  const audit = { record: vi.fn(), recordWithin: vi.fn().mockResolvedValue(undefined) };
  const tx = { name: 'tx' };
  const database = {
    db: { transaction: (run: (scope: unknown) => Promise<unknown>) => run(tx) },
  };

  const service = new AnnouncementAdminService(
    repository as unknown as AnnouncementAdminRepository,
    attachments as unknown as AnnouncementAttachmentRepository,
    audit as unknown as AuditRepository,
    database as unknown as DatabaseService,
  );

  return { service, repository, attachments, audit, tx };
}

describe('AnnouncementAdminService.setPinned', () => {
  it('menyematkan pengumuman terbit dan menyimpan cap waktu', async () => {
    const { service, repository, audit, tx } = buatService();

    const hasil = await service.setPinned(ID, true, AKTOR, KONTEKS, undefined);

    expect(hasil.isPinned).toBe(true);
    expect(repository.update).toHaveBeenCalledWith(
      tx,
      ID,
      undefined,
      expect.objectContaining({ isPinned: true, pinnedAt: expect.any(String) }),
    );
    expect(audit.recordWithin).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'pin', entityType: 'announcement', entityId: ID }),
    );
  });

  it('melepas sematan dan mengosongkan cap waktu', async () => {
    const { service, repository, audit } = buatService({
      baris: rowOf({ isPinned: true }),
    });

    const hasil = await service.setPinned(ID, false, AKTOR, KONTEKS, undefined);

    expect(hasil.isPinned).toBe(false);
    expect(repository.update).toHaveBeenCalledWith(
      expect.anything(),
      ID,
      undefined,
      expect.objectContaining({ isPinned: false, pinnedAt: null }),
    );
    expect(audit.recordWithin).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'unpin' }),
    );
  });

  it('menolak menyematkan pengumuman draf', async () => {
    const { service, repository } = buatService({ baris: rowOf({ status: 'draft' }) });

    await expect(service.setPinned(ID, true, AKTOR, KONTEKS, undefined)).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('menolak sematan keempat', async () => {
    const { service, repository } = buatService({ pinnedCount: 3 });

    await expect(service.setPinned(ID, true, AKTOR, KONTEKS, undefined)).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('mengizinkan menyematkan ulang saat jatah penuh demi idempotensi', async () => {
    const { service } = buatService({
      baris: rowOf({ isPinned: true }),
      pinnedCount: 3,
    });

    await expect(service.setPinned(ID, true, AKTOR, KONTEKS, undefined)).resolves.toBeDefined();
  });

  it('tidak menulis apa pun bila keadaan sudah sesuai', async () => {
    const { service, repository, audit } = buatService();

    const hasil = await service.setPinned(ID, false, AKTOR, KONTEKS, undefined);

    expect(hasil.isPinned).toBe(false);
    expect(repository.update).not.toHaveBeenCalled();
    expect(audit.recordWithin).not.toHaveBeenCalled();
  });

  it('melempar 404 ketika pengumuman tidak ada', async () => {
    const { service } = buatService({ baris: null });

    await expect(service.setPinned(ID, true, AKTOR, KONTEKS, undefined)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('menolak bila versi tidak cocok', async () => {
    const { service, repository } = buatService();

    repository.update.mockResolvedValueOnce(undefined);

    await expect(service.setPinned(ID, true, AKTOR, KONTEKS, 9)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
