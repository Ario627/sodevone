import { describe, expect, it, vi } from 'vitest';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { SessionContext } from '../auth/auth.service.js';
import type { RequestContext } from '../common/http/request-context.js';
import type { DatabaseService } from '../db/database.service.js';
import type { SiteSettingRow } from '../db/schema/site-setting.js';
import type { SiteSettingRepository } from './site-setting.repository.js';
import { SiteSettingService } from './site-setting.service.js';

const AKTOR: SessionContext = { userId: 'a1', username: 'admin', role: 'admin' } as SessionContext;

const KONTEKS = { ipHash: 'x'.repeat(64), correlationId: 'cid-0001' } as unknown as RequestContext;

const WAKTU = '2026-11-09 02:00:00+00';

function baris(value: Record<string, unknown>): SiteSettingRow {
  return { key: 'voxel-board', value, updatedBy: 'a1', updatedAt: WAKTU };
}

function buatService(row: SiteSettingRow | undefined) {
  const repository = {
    find: vi.fn().mockResolvedValue(row),
    upsert: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };

  const audit = { record: vi.fn(), recordWithin: vi.fn().mockResolvedValue(undefined) };
  const tx = { name: 'tx' };
  const database = { db: { transaction: (run: (scope: unknown) => Promise<unknown>) => run(tx) } };

  const service = new SiteSettingService(
    repository as unknown as SiteSettingRepository,
    audit as unknown as AuditRepository,
    database as unknown as DatabaseService,
  );

  return { service, repository, audit, tx };
}

const MASUKAN = { voxelBoard: { kind: 'teks', teks: 'XI PPLG', warna: 'sinyal' } } as const;

describe('SiteSettingService.publicSettings', () => {
  it('mengembalikan bawaan saat pengaturan belum diisi', async () => {
    const hasil = await buatService(undefined).service.publicSettings();

    expect(hasil.settings.voxelBoard).toEqual({ kind: 'teks', teks: 'XI', warna: 'sinyal' });
    expect(hasil.settings.updatedAt).toBeNull();
  });

  it('memakai nilai tersimpan saat bentuknya sah', async () => {
    const hasil = await buatService(baris(MASUKAN.voxelBoard)).service.publicSettings();

    expect(hasil.settings.voxelBoard).toEqual(MASUKAN.voxelBoard);
    expect(hasil.settings.updatedAt).toBe('2026-11-09T02:00:00.000Z');
  });

  it('kembali ke bawaan saat nilai tersimpan rusak, bukan gagal', async () => {
    const hasil = await buatService(baris({ kind: 'teks', teks: '' })).service.publicSettings();

    expect(hasil.settings.voxelBoard).toEqual({ kind: 'teks', teks: 'XI', warna: 'sinyal' });
  });

  it('menyusun ETag berbeda untuk nilai berubah', async () => {
    const awal = await buatService(undefined).service.publicSettings();
    const akhir = await buatService(baris(MASUKAN.voxelBoard)).service.publicSettings();

    expect(awal.etag).not.toBe(akhir.etag);
    expect(akhir.etag).toMatch(/^"[\x21\x23-\x7E]*"$/);
  });
});

describe('SiteSettingService.saveVoxelBoard', () => {
  it('menyimpan nilai dan mencatat audit', async () => {
    const { service, repository, audit, tx } = buatService(baris(MASUKAN.voxelBoard));

    await service.saveVoxelBoard(MASUKAN, AKTOR, KONTEKS);

    expect(repository.upsert).toHaveBeenCalledWith(
      tx,
      'voxel-board',
      MASUKAN.voxelBoard,
      AKTOR.userId,
    );
    expect(audit.recordWithin).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'update', entityType: 'setting' }),
    );
  });

  it('mengembalikan pengaturan setelah penyimpanan', async () => {
    const hasil = await buatService(baris(MASUKAN.voxelBoard)).service.saveVoxelBoard(
      MASUKAN,
      AKTOR,
      KONTEKS,
    );

    expect(hasil.voxelBoard).toEqual(MASUKAN.voxelBoard);
  });
});

describe('SiteSettingService.resetVoxelBoard', () => {
  it('menghapus baris supaya bawaan dipakai lagi', async () => {
    const { service, repository, tx } = buatService(undefined);

    const hasil = await service.resetVoxelBoard(AKTOR, KONTEKS);

    expect(repository.remove).toHaveBeenCalledWith(tx, 'voxel-board');
    expect(hasil.voxelBoard).toEqual({ kind: 'teks', teks: 'XI', warna: 'sinyal' });
  });
});
