import { BadRequestException, ConflictException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { SessionContext } from '../auth/auth.service.js';
import type { RequestContext } from '../common/http/request-context.js';
import type { Env } from '../config/env.js';
import type { DatabaseService } from '../db/database.service.js';
import { processImage } from '../media/image-processor.js';
import type { MediaStorageService } from '../media/media-storage.service.js';
import { AlbumAdminRepository } from './album-admin.repository.js';
import type { AlbumAdminRow } from './album-admin.repository.js';
import { AlbumAdminService } from './album-admin.service.js';
import { AlbumImageRepository } from './album-image.repository.js';
import type { AlbumImageRow } from './album-image.repository.js';

vi.mock('../media/image-processor.js', () => ({ processImage: vi.fn() }));

const storage = {
  write: vi.fn(),
  remove: vi.fn(),
  deliveryUrl: () => null,
  driver: 'local',
  remote: false,
  root: '/tmp/kelas-media-uji',
} as unknown as MediaStorageService;

const ALBUM_ID = '11111111-1111-4111-8111-111111111111';

const FIRST = '22222222-2222-4222-8222-222222222222';

const SECOND = '33333333-3333-4333-8333-333333333333';

const THIRD = '44444444-4444-4444-8444-444444444444';

const WAKTU = '2026-11-01 02:00:00+00';

const AKTOR: SessionContext = {
  sessionId: '55555555-5555-4555-8555-555555555555',
  userId: '66666666-6666-4666-8666-666666666666',
  username: 'budi',
  displayName: 'Budi Santoso',
  role: 'admin',
  expiresAt: '2026-11-01T12:00:00.000Z',
};

const KONTEKS: RequestContext = {
  ipHash: 'f'.repeat(64),
  userAgent: 'vitest',
  correlationId: 'abc12345',
};

function albumRowOf(overrides: Partial<AlbumAdminRow> = {}): AlbumAdminRow {
  return {
    id: ALBUM_ID,
    slug: 'pensi-sekolah',
    title: 'Pensi Sekolah',
    description: null,
    eventDate: '2026-10-30',
    status: 'draft',
    coverImageId: null,
    publishedAt: null,
    createdAt: WAKTU,
    updatedAt: WAKTU,
    ...overrides,
  };
}

function imageRowOf(id: string, sortOrder: number, altText: string | null = 'Foto'): AlbumImageRow {
  return { id, width: 1600, height: 900, altText, sortOrder };
}

function buatService(opsi: { album?: AlbumAdminRow; images?: AlbumImageRow[] } = {}) {
  const images = opsi.images ?? [imageRowOf(FIRST, 0), imageRowOf(SECOND, 1), imageRowOf(THIRD, 2)];
  let current = [...images];

  const albums = {
    findById: vi.fn().mockResolvedValue(opsi.album ?? albumRowOf()),
    countImagesOf: vi.fn().mockResolvedValue(new Map()),
    update: vi.fn().mockResolvedValue(undefined),
  };
  const imageRepository = {
    findMany: vi.fn().mockImplementation(async () => current),
    findOne: vi.fn().mockResolvedValue(current[0]),
    countWithoutAltText: vi.fn().mockResolvedValue(0),
    nextSortOrder: vi.fn().mockResolvedValue(0),
    insert: vi.fn().mockResolvedValue(undefined),
    updateAltText: vi.fn().mockResolvedValue(undefined),
    applyOrder: vi.fn().mockImplementation(async (_tx, _albumId, ids: string[]) => {
      current = ids.map((id, index) => ({ ...imageRowOf(id, index), altText: 'Foto' }));
    }),
    remove: vi.fn().mockResolvedValue({ storageKey: `${ALBUM_ID}/${FIRST}.webp` }),
  };
  const audit = { record: vi.fn(), recordWithin: vi.fn().mockResolvedValue(undefined) };
  const tx = { name: 'tx' };
  const database = { db: { transaction: (run: (scope: unknown) => Promise<unknown>) => run(tx) } };
  const config = {
    get: (key: string) => (key === 'MEDIA_ROOT' ? '/tmp/kelas-media-uji' : 2),
  } as unknown as ConfigService<Env, true>;


  const service = new AlbumAdminService(
    albums as unknown as AlbumAdminRepository,
    imageRepository as unknown as AlbumImageRepository,
    audit as unknown as AuditRepository,
    database as unknown as DatabaseService,
    storage,
    config,
  );

  return { service, albums, images: imageRepository, audit, tx };
}

beforeEach(() => {
  vi.mocked(processImage).mockReset();
  vi.mocked(storage.write).mockReset().mockResolvedValue(undefined);
  vi.mocked(storage.remove).mockReset().mockResolvedValue(undefined);
});

describe('AlbumAdminService.reorderImages', () => {
  it('menyimpan urutan baru dan mengembalikan foto berurutan', async () => {
    const { service, images, audit, tx } = buatService();

    const hasil = await service.reorderImages(ALBUM_ID, [THIRD, FIRST, SECOND], AKTOR, KONTEKS);

    expect(images.applyOrder).toHaveBeenCalledWith(tx, ALBUM_ID, [THIRD, FIRST, SECOND]);
    expect(hasil.map((image) => image.id)).toEqual([THIRD, FIRST, SECOND]);
    expect(hasil.map((image) => image.sortOrder)).toEqual([0, 1, 2]);
    expect(audit.recordWithin).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'update', entityType: 'album', entityId: ALBUM_ID }),
    );
  });

  it('menolak daftar dengan foto yang sama dua kali', async () => {
    const { service, images } = buatService();

    await expect(
      service.reorderImages(ALBUM_ID, [FIRST, FIRST], AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(images.applyOrder).not.toHaveBeenCalled();
  });

  it('menolak daftar yang tidak memuat seluruh foto album', async () => {
    const { service, images } = buatService();

    await expect(
      service.reorderImages(ALBUM_ID, [FIRST, SECOND], AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(images.applyOrder).not.toHaveBeenCalled();
  });

  it('menolak id yang bukan milik album ini', async () => {
    const { service } = buatService();

    await expect(
      service.reorderImages(
        ALBUM_ID,
        [FIRST, SECOND, '99999999-9999-4999-8999-999999999999'],
        AKTOR,
        KONTEKS,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('menolak menyusun ulang album yang diarsipkan', async () => {
    const { service, images } = buatService({ album: albumRowOf({ status: 'archived' }) });

    await expect(
      service.reorderImages(ALBUM_ID, [THIRD, FIRST, SECOND], AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(images.applyOrder).not.toHaveBeenCalled();
  });
});
