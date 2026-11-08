import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { SessionContext } from '../auth/auth.service.js';
import type { DatabaseService } from '../db/database.service.js';
import type { SocialRepository } from './social.repository.js';
import type { SocialAdminRow, SocialPublicRow } from './social.repository.js';
import { SocialService } from './social.service.js';

const LINK_ID = '3f9a1c4e-1111-4222-8333-444455556666';

const IMAGE_ID = '8f14e45f-ceea-467f-a8d3-1b7c1e1d9b21';

const AKTOR: SessionContext = { userId: 'a1', username: 'admin', role: 'admin' } as SessionContext;

const KONTEKS = { ipHash: 'x'.repeat(64), correlationId: 'cid-0001' } as never;

const URL_IG = 'https://www.instagram.com/p/CxYz/';

const URL_TT = 'https://www.tiktok.com/@kelas/video/1';

function barisPublik(patch: Partial<SocialPublicRow> = {}): SocialPublicRow {
  return {
    id: LINK_ID,
    platform: 'instagram',
    url: URL_IG,
    caption: 'Pensi',
    postedAt: '2026-10-29T01:00:00.000Z',
    imageId: IMAGE_ID,
    imageUrl: null,
    imageWidth: null,
    imageHeight: null,
    altText: null,
    galleryWidth: 1600,
    galleryHeight: 1200,
    galleryAltText: 'Suasana pensi',
    ...patch,
  };
}

function barisAdmin(patch: Partial<SocialAdminRow> = {}): SocialAdminRow {
  return {
    ...barisPublik(),
    sortOrder: 2,
    isVisible: true,
    createdAt: '2026-10-29T01:00:00.000Z',
    updatedAt: '2026-10-29T02:00:00.000Z',
    ...patch,
  };
}

type Opsi = {
  created?: { id: string };
  removed?: { id: string };
  latest?: string | null;
  rows?: SocialPublicRow[];
  adminRows?: SocialAdminRow[];
  galleryImage?: { id: string } | undefined;
  findById?: SocialAdminRow | undefined;
};

function buatService(opsi: Opsi = {}) {
  const repository = {
    findVisible: vi.fn().mockResolvedValue(opsi.rows ?? []),
    latestUpdatedAt: vi.fn().mockResolvedValue(opsi.latest ?? null),
    findMany: vi.fn().mockResolvedValue(opsi.adminRows ?? []),
    findById: vi.fn().mockResolvedValue(opsi.findById),
    nextSortOrder: vi.fn().mockResolvedValue(3),
    insert: vi.fn().mockResolvedValue(opsi.created ?? { id: LINK_ID }),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(opsi.removed),
    findGalleryImage: vi.fn().mockResolvedValue(opsi.galleryImage),
  };

  const audit = { record: vi.fn(), recordWithin: vi.fn().mockResolvedValue(undefined) };

  const tx = { name: 'tx' };

  const db = {
    transaction: (run: (scope: unknown) => Promise<unknown>) => run(tx),
  };

  const service = new SocialService(
    repository as unknown as SocialRepository,
    audit as unknown as AuditRepository,
    { db } as unknown as DatabaseService,
  );

  return { service, repository, audit, tx };
}

describe('SocialService.collection', () => {
  it('membuang tautan yang gambarnya tidak dapat diselesaikan', async () => {
    const { service } = buatService({
      rows: [
        barisPublik(),
        barisPublik({
          id: 'lain',
          imageId: IMAGE_ID,
          galleryWidth: null,
          galleryHeight: null,
        }),
      ],
    });

    const hasil = await service.collection({ limit: 8 });

    expect(hasil.items).toHaveLength(1);
    expect(hasil.items[0]?.id).toBe(LINK_ID);
  });

  it('memakai dimensi dan teks alternatif dari media lokal', async () => {
    const { service } = buatService({ rows: [barisPublik()] });

    const hasil = await service.collection({ limit: 8 });

    expect(hasil.items[0]?.image).toEqual({
      id: IMAGE_ID,
      url: null,
      width: 1600,
      height: 1200,
      altText: 'Suasana pensi',
    });
  });

  it('mendukung gambar dari alamat luar tanpa id media', async () => {
    const { service } = buatService({
      rows: [
        barisPublik({
          imageId: null,
          imageUrl: 'https://cdn.contoh.test/a.jpg',
          imageWidth: 1080,
          imageHeight: 1080,
          altText: 'Poster',
          galleryWidth: null,
          galleryHeight: null,
          galleryAltText: null,
        }),
      ],
    });

    const hasil = await service.collection({ limit: 8 });

    expect(hasil.items[0]?.image).toEqual({
      id: null,
      url: 'https://cdn.contoh.test/a.jpg',
      width: 1080,
      height: 1080,
      altText: 'Poster',
    });
  });

  it('menyusun ETag dari waktu ubah terakhir dan jumlah item', async () => {
    const { service } = buatService({
      rows: [barisPublik()],
      latest: '2026-10-29T02:00:00.000Z',
    });

    const hasil = await service.collection({ limit: 8 });

    expect(hasil.etag).toBe('"2026-10-29T02:00:00.000Z-1"');
  });

  it('memakai penanda kosong saat belum ada tautan', async () => {
    const { service } = buatService();

    const hasil = await service.collection({ limit: 8 });

    expect(hasil.etag).toBe('"kosong-0"');
  });
});

describe('SocialService.create', () => {
  it('menolak tautan yang hostnya tidak cocok dengan platform', async () => {
    const { service, repository } = buatService({ galleryImage: { id: IMAGE_ID } });

    await expect(
      service.create({ platform: 'tiktok', url: URL_IG, imageId: IMAGE_ID }, AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.insert).not.toHaveBeenCalled();
  });

  it('menolak ketika kedua sumber gambar diisi', async () => {
    const { service } = buatService({ galleryImage: { id: IMAGE_ID } });

    await expect(
      service.create(
        {
          platform: 'instagram',
          url: URL_IG,
          imageId: IMAGE_ID,
          imageUrl: 'https://cdn.contoh.test/a.jpg',
          imageWidth: 10,
          imageHeight: 10,
        },
        AKTOR,
        KONTEKS,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('menolak ketika tidak ada sumber gambar sama sekali', async () => {
    const { service } = buatService();

    await expect(
      service.create({ platform: 'instagram', url: URL_IG }, AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('menolak gambar luar tanpa dimensi', async () => {
    const { service } = buatService();

    await expect(
      service.create(
        { platform: 'instagram', url: URL_IG, imageUrl: 'https://cdn.contoh.test/a.jpg' },
        AKTOR,
        KONTEKS,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('menolak media lokal yang tidak ada', async () => {
    const { service, repository } = buatService({ galleryImage: undefined });

    await expect(
      service.create({ platform: 'instagram', url: URL_IG, imageId: IMAGE_ID }, AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.insert).not.toHaveBeenCalled();
  });

  it('menyimpan tautan, memberi urutan otomatis, dan mencatat audit', async () => {
    const { service, repository, audit, tx } = buatService({
      galleryImage: { id: IMAGE_ID },
      findById: barisAdmin(),
    });

    await service.create(
      { platform: 'instagram', url: URL_IG, imageId: IMAGE_ID, caption: 'Pensi' },
      AKTOR,
      KONTEKS,
    );

    expect(repository.insert).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ platform: 'instagram', imageId: IMAGE_ID, sortOrder: 3 }),
    );
    expect(audit.recordWithin).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'create', entityType: 'social', entityId: LINK_ID }),
    );
  });

  it('menghormati urutan yang dikirim admin', async () => {
    const { service, repository, tx } = buatService({
      galleryImage: { id: IMAGE_ID },
      findById: barisAdmin(),
    });

    await service.create(
      { platform: 'instagram', url: URL_IG, imageId: IMAGE_ID, sortOrder: 0 },
      AKTOR,
      KONTEKS,
    );

    expect(repository.nextSortOrder).not.toHaveBeenCalled();
    expect(repository.insert).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ sortOrder: 0 }),
    );
  });
});

describe('SocialService.update', () => {
  it('melempar 404 ketika tautan tidak ada', async () => {
    const { service } = buatService({ findById: undefined });

    await expect(service.update(LINK_ID, { isVisible: false }, AKTOR, KONTEKS)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('memvalidasi gabungan platform dan url hasil patch', async () => {
    const { service } = buatService({ findById: barisAdmin({ url: URL_TT, platform: 'tiktok' }) });

    await expect(
      service.update(LINK_ID, { url: URL_IG }, AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('menolak menghapus kedua sumber gambar sekaligus', async () => {
    const { service } = buatService({ findById: barisAdmin() });

    await expect(
      service.update(LINK_ID, { imageId: null, imageUrl: null }, AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('mempertahankan gambar saat patch tidak menyentuhnya', async () => {
    const { service, repository } = buatService({ findById: barisAdmin() });

    await service.update(LINK_ID, { caption: 'Baru' }, AKTOR, KONTEKS);

    expect(repository.update).toHaveBeenCalledWith(
      expect.anything(),
      LINK_ID,
      expect.objectContaining({ imageId: IMAGE_ID, imageUrl: null }),
    );
  });
});

describe('SocialService.remove', () => {
  it('melempar 404 ketika baris sudah tidak ada', async () => {
    const { service } = buatService({ removed: undefined });

    await expect(service.remove(LINK_ID, AKTOR, KONTEKS)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('menghapus baris dan mencatat audit', async () => {
    const { service, audit, tx } = buatService({ removed: { id: LINK_ID } });

    await expect(service.remove(LINK_ID, AKTOR, KONTEKS)).resolves.toEqual({ id: LINK_ID });

    expect(audit.recordWithin).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'delete', entityType: 'social' }),
    );
  });
});

describe('SocialService.list', () => {
  it('memetakan baris admin apa adanya', async () => {
    const { service } = buatService({ adminRows: [barisAdmin()] });

    const hasil = await service.list();

    expect(hasil.items[0]).toEqual({
      id: LINK_ID,
      platform: 'instagram',
      url: URL_IG,
      caption: 'Pensi',
      postedAt: '2026-10-29T01:00:00.000Z',
      imageId: IMAGE_ID,
      imageUrl: null,
      imageWidth: null,
      imageHeight: null,
      altText: null,
      sortOrder: 2,
      isVisible: true,
      createdAt: '2026-10-29T01:00:00.000Z',
      updatedAt: '2026-10-29T02:00:00.000Z',
    });
  });
});
