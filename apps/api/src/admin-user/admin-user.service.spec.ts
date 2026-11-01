import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { AuthRepository } from '../auth/auth.repository.js';
import type { SessionContext } from '../auth/auth.service.js';
import type { RequestContext } from '../common/http/request-context.js';
import type { Env } from '../config/env.js';
import type { DatabaseService } from '../db/database.service.js';
import { AdminUserRepository } from './admin-user.repository.js';
import type { AdminUserListRow } from './admin-user.repository.js';
import { AdminUserService } from './admin-user.service.js';

const TARGET_ID = '11111111-1111-4111-8111-111111111111';

const ACTOR_ID = '22222222-2222-4222-8222-222222222222';

const WAKTU = '2026-11-01 02:00:00+00';

const KONTEKS: RequestContext = {
  ipHash: 'e'.repeat(64),
  userAgent: 'vitest',
  correlationId: 'abc12345',
};

const AKTOR: SessionContext = {
  sessionId: '33333333-3333-4333-8333-333333333333',
  userId: ACTOR_ID,
  username: 'budi',
  displayName: 'Budi Santoso',
  role: 'admin',
  expiresAt: '2026-11-01T12:00:00.000Z',
};

const UNIQUE = Object.assign(new Error('duplikat'), { code: '23505' });

const KUAT = 'sepeda-lipat-berwarna-hijau';

function rowOf(overrides: Partial<AdminUserListRow> = {}): AdminUserListRow {
  return {
    id: TARGET_ID,
    username: 'sari',
    displayName: 'Sari Editor',
    role: 'editor',
    isActive: true,
    createdAt: WAKTU,
    lastLoginAt: null,
    ...overrides,
  };
}

function configOf(): ConfigService<Env, true> {
  return {
    get: (key: string) => (key === 'PASSWORD_BREACH_CHECK' ? 'disabled' : 2_500),
  } as unknown as ConfigService<Env, true>;
}

type Opsi = {
  page?: { rows: AdminUserListRow[]; total: number };
  baris?: AdminUserListRow | null;
  activeAdmins?: number;
  insertError?: unknown;
};

function buatService(opsi: Opsi = {}) {
  const baris = opsi.baris === null ? undefined : (opsi.baris ?? rowOf());
  const repository = {
    findPage: vi.fn().mockResolvedValue(opsi.page ?? { rows: [], total: 0 }),
    findById: vi.fn().mockResolvedValue(baris),
    lockAdminGuard: vi.fn().mockResolvedValue(undefined),
    countActiveAdmins: vi.fn().mockResolvedValue(opsi.activeAdmins ?? 1),
    insert: vi.fn().mockImplementation(async () => {
      if (opsi.insertError !== undefined) {
        throw opsi.insertError;
      }

      return { id: TARGET_ID };
    }),
    update: vi.fn().mockResolvedValue(undefined),
  };
  const auth = { revokeSessionsOfUserWithin: vi.fn().mockResolvedValue(undefined) };
  const audit = { record: vi.fn(), recordWithin: vi.fn().mockResolvedValue(undefined) };
  const tx = { name: 'tx' };
  const database = {
    db: {
      transaction: (run: (scope: unknown) => Promise<unknown>) => run(tx),
    },
  };

  const service = new AdminUserService(
    repository as unknown as AdminUserRepository,
    auth as unknown as AuthRepository,
    audit as unknown as AuditRepository,
    database as unknown as DatabaseService,
    configOf(),
  );

  return { service, repository, auth, audit, tx };
}

describe('AdminUserService.list', () => {
  it('memetakan baris dan menghitung meta paginasi', async () => {
    const { service, repository } = buatService({
      page: { rows: [rowOf()], total: 3 },
    });

    const hasil = await service.list({ page: 1, perPage: 20 });

    expect(repository.findPage).toHaveBeenCalledWith({
      page: 1,
      perPage: 20,
      role: undefined,
      active: undefined,
      search: undefined,
    });
    expect(hasil.meta).toEqual({ page: 1, perPage: 20, total: 3, totalPages: 1 });
    expect(hasil.items).toEqual([
      {
        id: TARGET_ID,
        username: 'sari',
        displayName: 'Sari Editor',
        role: 'editor',
        isActive: true,
        createdAt: '2026-11-01T02:00:00.000Z',
        lastLoginAt: null,
      },
    ]);
  });

  it('meneruskan filter peran, status, dan kata kunci', async () => {
    const { service, repository } = buatService();

    await service.list({ page: 2, perPage: 50, role: 'editor', aktif: false, q: 'sari' });

    expect(repository.findPage).toHaveBeenCalledWith({
      page: 2,
      perPage: 50,
      role: 'editor',
      active: false,
      search: 'sari',
    });
  });
});

describe('AdminUserService.create', () => {
  it('menyimpan hash argon2 dan mencatat audit user_created', async () => {
    const { service, repository, audit, tx } = buatService();

    const hasil = await service.create(
      { username: 'sari', displayName: 'Sari Editor', password: KUAT, role: 'editor' },
      AKTOR,
      KONTEKS,
    );

    const tersimpan = repository.insert.mock.calls[0]?.[1] as
      | { passwordHash: string; role: string }
      | undefined;

    expect(tersimpan?.role).toBe('editor');
    expect(tersimpan?.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(tersimpan?.passwordHash).not.toContain(KUAT);
    expect(audit.recordWithin).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'user_created',
        entityType: 'user',
        entityId: TARGET_ID,
        actorId: ACTOR_ID,
      }),
    );
    expect(hasil.username).toBe('sari');
  });

  it('menolak kata sandi yang memuat nama pengguna sebelum menyentuh basis data', async () => {
    const { service, repository } = buatService();

    await expect(
      service.create(
        { username: 'sari', displayName: 'Sari Editor', password: 'sari-sari-sari', role: 'editor' },
        AKTOR,
        KONTEKS,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it('mengubah pelanggaran keunikan menjadi 409 dengan pesan yang aman', async () => {
    const { service } = buatService({ insertError: UNIQUE });

    await expect(
      service.create(
        { username: 'sari', displayName: 'Sari Editor', password: KUAT, role: 'editor' },
        AKTOR,
        KONTEKS,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('AdminUserService.update', () => {
  it('melempar 404 ketika akun tidak ada', async () => {
    const { service } = buatService({ baris: null });

    await expect(
      service.update(TARGET_ID, { displayName: 'Nama Baru' }, AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('menolak menonaktifkan akun sendiri', async () => {
    const { service, repository } = buatService({ baris: rowOf({ id: ACTOR_ID, role: 'admin' }) });

    await expect(
      service.update(ACTOR_ID, { isActive: false }, AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('menolak menurunkan peran akun sendiri', async () => {
    const { service } = buatService({ baris: rowOf({ id: ACTOR_ID, role: 'admin' }) });

    await expect(service.update(ACTOR_ID, { role: 'editor' }, AKTOR, KONTEKS)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('menolak menonaktifkan administrator aktif terakhir', async () => {
    const { service, auth } = buatService({
      baris: rowOf({ role: 'admin', isActive: true }),
      activeAdmins: 0,
    });

    await expect(
      service.update(TARGET_ID, { isActive: false }, AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(auth.revokeSessionsOfUserWithin).not.toHaveBeenCalled();
  });

  it('mengizinkan penonaktifan ketika masih ada administrator lain', async () => {
    const { service, repository, auth, audit, tx } = buatService({
      baris: rowOf({ role: 'admin', isActive: true }),
      activeAdmins: 1,
    });

    await service.update(TARGET_ID, { isActive: false }, AKTOR, KONTEKS);

    expect(repository.lockAdminGuard).toHaveBeenCalledWith(tx);
    expect(repository.update).toHaveBeenCalledWith(
      tx,
      TARGET_ID,
      expect.objectContaining({ isActive: false }),
    );
    expect(auth.revokeSessionsOfUserWithin).toHaveBeenCalledWith(
      tx,
      TARGET_ID,
      expect.any(String),
    );
    expect(audit.recordWithin).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'user_deactivated', entityId: TARGET_ID }),
    );
  });

  it('tidak mengambil kunci administrator untuk perubahan nama tampilan pada editor', async () => {
    const { service, repository, auth, audit } = buatService({ baris: rowOf() });

    await service.update(TARGET_ID, { displayName: 'Nama Baru' }, AKTOR, KONTEKS);

    expect(repository.lockAdminGuard).not.toHaveBeenCalled();
    expect(auth.revokeSessionsOfUserWithin).not.toHaveBeenCalled();
    expect(audit.recordWithin).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'update' }),
    );
  });

  it('mengaktifkan kembali akun tanpa mencabut sesi', async () => {
    const { service, repository, auth } = buatService({
      baris: rowOf({ isActive: false }),
    });

    await service.update(TARGET_ID, { isActive: true }, AKTOR, KONTEKS);

    expect(repository.update).toHaveBeenCalledWith(
      expect.anything(),
      TARGET_ID,
      expect.objectContaining({ isActive: true }),
    );
    expect(auth.revokeSessionsOfUserWithin).not.toHaveBeenCalled();
  });
});
