import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { SessionContext } from '../auth/auth.service.js';
import type { DatabaseService } from '../db/database.service.js';
import type { SiteContributorRow } from '../db/schema/site-contributor.js';
import { ContributorRepository, PRIMARY_CONTRIBUTOR_ID } from './contributor.repository.js';
import { ContributorService } from './contributor.service.js';

const AKTOR: SessionContext = { userId: 'a1', username: 'admin', role: 'admin' } as SessionContext;

const KONTEKS = { ipHash: 'x'.repeat(64), correlationId: 'cid-0001' } as never;

const UPDATED_AT = '2026-10-29 02:00:00+00';

function baris(patch: Partial<SiteContributorRow> = {}): SiteContributorRow {
  return {
    id: PRIMARY_CONTRIBUTOR_ID,
    name: 'Ario Abdillah Sajad',
    nickname: 'Ario',
    role: 'Perancang & pengembang situs',
    className: 'XI PPLG 1',
    summary: 'Situs ini dikerjakan sendiri dari nol tanpa templat.',
    focuses: [{ title: 'Antarmuka', body: 'Tata letak, kisi, tipografi, dan warna.' }],
    tools: ['Angular', 'NestJS'],
    isPublished: true,
    sortOrder: 0,
    createdAt: UPDATED_AT,
    updatedAt: UPDATED_AT,
    ...patch,
  };
}

function buatService(row: SiteContributorRow | undefined) {
  const repository = {
    findById: vi.fn().mockResolvedValue(row),
    upsert: vi.fn().mockResolvedValue(undefined),
  };

  const audit = { record: vi.fn(), recordWithin: vi.fn().mockResolvedValue(undefined) };

  const tx = { name: 'tx' };

  const db = { transaction: (run: (scope: unknown) => Promise<unknown>) => run(tx) };

  const service = new ContributorService(
    repository as unknown as ContributorRepository,
    audit as unknown as AuditRepository,
    { db } as unknown as DatabaseService,
  );

  return { service, repository, audit, tx };
}

const MASUKAN = {
  name: 'Ario Abdillah Sajad',
  nickname: 'Ario',
  role: 'Perancang & pengembang situs',
  className: 'XI PPLG 1',
  summary: 'Situs ini dikerjakan sendiri dari nol tanpa templat.',
  focuses: [{ title: 'Antarmuka', body: 'Tata letak, kisi, tipografi, dan warna.' }],
  tools: ['Angular', 'NestJS'],
  isPublished: true,
};

describe('ContributorService.published', () => {
  it('mengembalikan null ketika kartu belum diisi', async () => {
    await expect(buatService(undefined).service.published()).resolves.toBeNull();
  });

  it('mengembalikan null ketika kartu disembunyikan', async () => {
    await expect(
      buatService(baris({ isPublished: false })).service.published(),
    ).resolves.toBeNull();
  });

  it('menyajikan kartu tanpa penanda publikasi', async () => {
    const hasil = await buatService(baris()).service.published();

    expect(hasil?.contributor).toEqual({
      id: PRIMARY_CONTRIBUTOR_ID,
      name: 'Ario Abdillah Sajad',
      nickname: 'Ario',
      role: 'Perancang & pengembang situs',
      className: 'XI PPLG 1',
      summary: 'Situs ini dikerjakan sendiri dari nol tanpa templat.',
      focuses: [{ title: 'Antarmuka', body: 'Tata letak, kisi, tipografi, dan warna.' }],
      tools: ['Angular', 'NestJS'],
    });
  });

  it('menyusun ETag yang aman dari cap waktu basis data', async () => {
    const hasil = await buatService(baris()).service.published();

    expect(hasil?.etag).toBe('"2026-10-29-02-00-00-00-1"');
  });
});

describe('ContributorService.current', () => {
  it('melempar 404 ketika kartu belum ada', async () => {
    await expect(buatService(undefined).service.current()).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('menyertakan penanda publikasi dan waktu ubah ISO', async () => {
    const hasil = await buatService(baris({ isPublished: false })).service.current();

    expect(hasil.isPublished).toBe(false);
    expect(hasil.updatedAt).toBe('2026-10-29T02:00:00.000Z');
  });
});

describe('ContributorService.save', () => {
  it('menyimpan dengan id tetap agar hanya ada satu kartu', async () => {
    const { service, repository, tx } = buatService(baris());

    await service.save(MASUKAN, AKTOR, KONTEKS);

    expect(repository.upsert).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ id: PRIMARY_CONTRIBUTOR_ID, tools: ['Angular', 'NestJS'] }),
    );
  });

  it('mencatat audit dengan entitas pembuat', async () => {
    const { service, audit, tx } = buatService(baris());

    await service.save(MASUKAN, AKTOR, KONTEKS);

    expect(audit.recordWithin).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'update',
        entityType: 'contributor',
        entityId: PRIMARY_CONTRIBUTOR_ID,
      }),
    );
  });

  it('mengembalikan kartu setelah penyimpanan', async () => {
    const hasil = await buatService(baris()).service.save(MASUKAN, AKTOR, KONTEKS);

    expect(hasil.name).toBe('Ario Abdillah Sajad');
  });

  it('melempar 404 ketika baris tidak muncul setelah penyimpanan', async () => {
    await expect(
      buatService(undefined).service.save(MASUKAN, AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
