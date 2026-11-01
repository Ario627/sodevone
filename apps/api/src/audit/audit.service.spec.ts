import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { SessionContext } from '../auth/auth.service.js';
import type { AuditLogRow } from '../db/schema/audit-log.js';
import { AuditRepository } from './audit.repository.js';
import { AuditService } from './audit.service.js';

const ACTOR_ID = '22222222-2222-4222-8222-222222222222';

const OTHER_ID = '44444444-4444-4444-8444-444444444444';

const WAKTU = '2026-11-01 02:00:00+00';

function adminSession(): SessionContext {
  return {
    sessionId: '55555555-5555-4555-8555-555555555555',
    userId: ACTOR_ID,
    username: 'budi',
    displayName: 'Budi Santoso',
    role: 'admin',
    expiresAt: '2026-11-01T12:00:00.000Z',
  };
}

function editorSession(): SessionContext {
  return { ...adminSession(), role: 'editor', username: 'sari', displayName: 'Sari Editor' };
}

function rowOf(overrides: Partial<AuditLogRow> = {}): AuditLogRow {
  return {
    id: 12,
    createdAt: WAKTU,
    actorId: ACTOR_ID,
    actorLabel: 'budi',
    action: 'create',
    entityType: 'announcement',
    entityId: '66666666-6666-4666-8666-666666666666',
    ipHash: 'f'.repeat(64),
    correlationId: 'abc12345',
    ...overrides,
  };
}

function buatService(rows: AuditLogRow[] = [rowOf()], total = 1) {
  const repository = { findPage: vi.fn().mockResolvedValue({ rows, total }) };
  const service = new AuditService(repository as unknown as AuditRepository);

  return { service, repository };
}

describe('AuditService.list', () => {
  it('membatasi editor pada aktivitasnya sendiri', async () => {
    const { service, repository } = buatService();

    await service.list({ page: 1, perPage: 20 }, editorSession());

    expect(repository.findPage).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: ACTOR_ID }),
    );
  });

  it('menolak editor yang meminta audit pengguna lain', async () => {
    const { service } = buatService();

    await expect(
      service.list({ page: 1, perPage: 20, actorId: OTHER_ID }, editorSession()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('mengizinkan administrator membaca seluruh aktivitas', async () => {
    const { service, repository } = buatService();

    await service.list({ page: 1, perPage: 20 }, adminSession());

    expect(repository.findPage).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: undefined }),
    );
  });

  it('meneruskan filter aktor dari administrator', async () => {
    const { service, repository } = buatService();

    await service.list({ page: 1, perPage: 20, actorId: OTHER_ID }, adminSession());

    expect(repository.findPage).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: OTHER_ID }),
    );
  });

  it('mengubah tanggal WIB menjadi batas UTC', async () => {
    const { service, repository } = buatService();

    await service.list({ page: 1, perPage: 20, from: '2026-11-01', to: '2026-11-01' }, adminSession());

    expect(repository.findPage).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '2026-10-31T17:00:00.000Z',
        to: '2026-11-01T16:59:59.999Z',
      }),
    );
  });

  it('menolak rentang tanggal terbalik', async () => {
    const { service, repository } = buatService();

    await expect(
      service.list({ page: 1, perPage: 20, from: '2026-11-02', to: '2026-11-01' }, adminSession()),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findPage).not.toHaveBeenCalled();
  });

  it('tidak mengirim alamat IP ter-hash ke klien', async () => {
    const { service } = buatService();

    const hasil = await service.list({ page: 1, perPage: 20 }, adminSession());

    expect(hasil.items[0]).not.toHaveProperty('ipHash');
    expect(hasil.items[0]).toEqual({
      id: 12,
      createdAt: '2026-11-01T02:00:00.000Z',
      actorId: ACTOR_ID,
      actorLabel: 'budi',
      action: 'create',
      entityType: 'announcement',
      entityId: '66666666-6666-4666-8666-666666666666',
      correlationId: 'abc12345',
    });
  });

  it('menghitung total halaman', async () => {
    const { service } = buatService([rowOf()], 45);

    const hasil = await service.list({ page: 2, perPage: 20 }, adminSession());

    expect(hasil.meta).toEqual({ page: 2, perPage: 20, total: 45, totalPages: 3 });
  });
});
