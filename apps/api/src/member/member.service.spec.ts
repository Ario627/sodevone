import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { SessionContext } from '../auth/auth.service.js';
import type { DatabaseService } from '../db/database.service.js';
import type { ClassMemberRow } from '../db/schema/class-member.js';
import { ClassMemberRepository } from './class-member.repository.js';
import { MemberService } from './member.service.js';

const AKTOR: SessionContext = { userId: 'a1', username: 'admin', role: 'admin' } as SessionContext;

const KONTEKS = { ipHash: 'x'.repeat(64), correlationId: 'cid-0001' } as never;

const UPDATED_AT = '2026-10-29 02:00:00+00';

function baris(patch: Partial<ClassMemberRow> = {}): ClassMemberRow {
  return {
    id: '3f9a1c4e-1111-4222-8333-444455556666',
    role: 'student',
    fullName: 'Aditya Pranawa',
    nickname: 'Adit',
    hobby: 'menyusun playlist',
    note: 'Kalau ada bug, dia yang pertama bilang coba restart.',
    sortOrder: 0,
    isPublished: true,
    createdAt: UPDATED_AT,
    updatedAt: UPDATED_AT,
    ...patch,
  };
}

type Opsi = {
  published?: ClassMemberRow[];
  all?: ClassMemberRow[];
  fingerprint?: { count: number; latest: string | undefined };
};

function buatService(opsi: Opsi = {}) {
  const repository = {
    findPublished: vi.fn().mockResolvedValue(opsi.published ?? []),
    findMany: vi.fn().mockResolvedValue(opsi.all ?? []),
    fingerprint: vi.fn().mockResolvedValue(opsi.fingerprint ?? { count: 0, latest: undefined }),
    replaceAll: vi.fn().mockResolvedValue(undefined),
  };

  const audit = { record: vi.fn(), recordWithin: vi.fn().mockResolvedValue(undefined) };

  const tx = { name: 'tx' };

  const db = { transaction: (run: (scope: unknown) => Promise<unknown>) => run(tx) };

  const service = new MemberService(
    { db } as unknown as DatabaseService,
    repository as unknown as ClassMemberRepository,
    audit as unknown as AuditRepository,
  );

  return { service, repository, audit, tx };
}

function masukan(patch: Record<string, unknown> = {}) {
  return {
    role: 'student' as const,
    fullName: 'Aditya Pranawa',
    nickname: 'Adit',
    hobby: 'menyusun playlist',
    note: 'Kalau ada bug, dia yang pertama bilang coba restart.',
    isPublished: true,
    ...patch,
  };
}

describe('MemberService.collection', () => {
  it('mengurutkan nomor mulai dari satu sesuai urutan baris', async () => {
    const { service } = buatService({
      published: [baris({ sortOrder: 0 }), baris({ id: 'lain', sortOrder: 1 })],
    });

    const hasil = await service.collection();

    expect(hasil.items.map((item) => item.order)).toEqual([1, 2]);
  });

  it('menyusun ETag dari cap waktu dan jumlah anggota tampil', async () => {
    const { service } = buatService({
      published: [baris()],
      fingerprint: { count: 36, latest: UPDATED_AT },
    });

    const hasil = await service.collection();

    expect(hasil.etag).toBe('"2026-10-29-02-00-00-00-36"');
  });

  it('memakai penanda kosong saat belum ada anggota tampil', async () => {
    const hasil = await buatService().service.collection();

    expect(hasil.etag).toBe('"kosong-0"');
    expect(hasil.items).toEqual([]);
  });

  it('tidak membocorkan penanda publikasi pada respons publik', async () => {
    const hasil = await buatService({
      published: [baris({ isPublished: false })],
    }).service.collection();

    expect(Object.keys(hasil.items[0] ?? {})).toEqual([
      'id',
      'order',
      'role',
      'fullName',
      'nickname',
      'hobby',
      'note',
    ]);
  });
});

describe('MemberService.roster', () => {
  it('menyertakan penanda publikasi untuk panel', async () => {
    const { service } = buatService({ all: [baris({ isPublished: false })] });

    const hasil = await service.roster();

    expect(hasil.items[0]?.isPublished).toBe(false);
    expect(hasil.items[0]?.updatedAt).toBe('2026-10-29T02:00:00.000Z');
  });
});

describe('MemberService.replace', () => {
  it('menolak dua wali kelas', async () => {
    const { service, repository } = buatService();

    await expect(
      service.replace(
        {
          items: [
            masukan({ role: 'homeroom' }),
            masukan({ role: 'homeroom', fullName: 'Bu Ratna' }),
          ],
        },
        AKTOR,
        KONTEKS,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.replaceAll).not.toHaveBeenCalled();
  });

  it('mengizinkan satu wali kelas di urutan terakhir', async () => {
    const { service } = buatService({ all: [baris()] });

    await expect(
      service.replace(
        { items: [masukan(), masukan({ role: 'homeroom', fullName: 'Ratna Kusumaningrum' })] },
        AKTOR,
        KONTEKS,
      ),
    ).resolves.toBeDefined();
  });

  it('mengizinkan daftar kosong untuk menyembunyikan seluruh anggota', async () => {
    const { service, repository, tx } = buatService();

    await service.replace({ items: [] }, AKTOR, KONTEKS);

    expect(repository.replaceAll).toHaveBeenCalledWith(tx, []);
  });

  it('memberi nomor urut berurutan mulai nol', async () => {
    const { service, repository, tx } = buatService();

    await service.replace(
      { items: [masukan(), masukan({ fullName: 'Bunga Larasati' })] },
      AKTOR,
      KONTEKS,
    );

    expect(repository.replaceAll).toHaveBeenCalledWith(tx, [
      expect.objectContaining({ sortOrder: 0 }),
      expect.objectContaining({ sortOrder: 1 }),
    ]);
  });

  it('mencatat audit dengan entitas anggota', async () => {
    const { service, audit, tx } = buatService();

    await service.replace({ items: [masukan()] }, AKTOR, KONTEKS);

    expect(audit.recordWithin).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'update', entityType: 'member', entityId: null }),
    );
  });

  it('mengembalikan daftar terbaru setelah penggantian', async () => {
    const { service } = buatService({ all: [baris(), baris({ id: 'dua', sortOrder: 1 })] });

    const hasil = await service.replace({ items: [masukan()] }, AKTOR, KONTEKS);

    expect(hasil.items).toHaveLength(2);
  });
});
