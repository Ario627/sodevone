import { ConflictException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { SessionContext } from '../auth/auth.service.js';
import type { RequestContext } from '../common/http/request-context.js';
import type { Env } from '../config/env.js';
import type { DatabaseService } from '../db/database.service.js';
import type { ProcessedImage } from '../media/image-processor.js';
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

const IMAGE_ID = '22222222-2222-4222-8222-222222222222';

const WAKTU = '2026-11-01 02:00:00+00';

const AKTOR: SessionContext = {
  sessionId: '33333333-3333-4333-8333-333333333333',
  userId: '44444444-4444-4444-8444-444444444444',
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

const UNIQUE = Object.assign(new Error('duplikat'), { code: '23505' });

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

function imageRowOf(overrides: Partial<AlbumImageRow> = {}): AlbumImageRow {
  return { id: IMAGE_ID, width: 1600, height: 900, altText: 'Suasana pensi', sortOrder: 0, ...overrides };
}

function processedOf(): ProcessedImage {
  const part = (width: number, height: number): { bytes: Buffer; width: number; height: number } => ({
    bytes: Buffer.alloc(1024),
    width,
    height,
  });

  return { master: part(1600, 900), medium: part(1024, 576), small: part(480, 270) };
}

type Opsi = {
  album?: AlbumAdminRow | null;
  images?: AlbumImageRow[];
  missingAlt?: number;
  nextSortOrder?: number;
  removed?: { storageKey: string };
  insertError?: unknown;
  updateError?: unknown;
};

function buatService(opsi: Opsi = {}) {
  const album = opsi.album === null ? undefined : (opsi.album ?? albumRowOf());
  const albums = {
    findPage: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    findById: vi.fn().mockResolvedValue(album),
    countImagesOf: vi.fn().mockResolvedValue(new Map([[ALBUM_ID, opsi.images?.length ?? 0]])),
    insert: vi.fn().mockImplementation(async () => {
      if (opsi.insertError !== undefined) {
        throw opsi.insertError;
      }

      return { id: ALBUM_ID };
    }),
    update: vi.fn().mockImplementation(async () => {
      if (opsi.updateError !== undefined) {
        throw opsi.updateError;
      }
    }),
    recordRedirect: vi.fn().mockResolvedValue(undefined),
    dropRedirect: vi.fn().mockResolvedValue(undefined),
  };
  const images = {
    findMany: vi.fn().mockResolvedValue(opsi.images ?? []),
    findOne: vi.fn().mockResolvedValue(opsi.images?.[0]),
    countWithoutAltText: vi.fn().mockResolvedValue(opsi.missingAlt ?? 0),
    nextSortOrder: vi.fn().mockResolvedValue(opsi.nextSortOrder ?? 0),
    insert: vi.fn().mockResolvedValue(undefined),
    updateAltText: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(opsi.removed),
  };
  const audit = { record: vi.fn(), recordWithin: vi.fn().mockResolvedValue(undefined) };
  const tx = { name: 'tx' };
  const database = { db: { transaction: (run: (scope: unknown) => Promise<unknown>) => run(tx) } };
  const config = {
    get: (key: string) => (key === 'MEDIA_ROOT' ? '/tmp/kelas-media-uji' : 2),
  } as unknown as ConfigService<Env, true>;

  const service = new AlbumAdminService(
    albums as unknown as AlbumAdminRepository,
    images as unknown as AlbumImageRepository,
    audit as unknown as AuditRepository,
    database as unknown as DatabaseService,
    storage,
    config,
  );

  return { service, albums, images, audit, tx };
}

beforeEach(() => {
  vi.mocked(processImage).mockReset();
  vi.mocked(storage.write).mockReset().mockResolvedValue(undefined);
  vi.mocked(storage.remove).mockReset().mockResolvedValue(undefined);
});

describe('AlbumAdminService.create', () => {
  it('membuat album draf dengan slug turunan judul', async () => {
    const { service, albums, audit, tx } = buatService();

    await service.create(
      { title: 'Pensi Sekolah 2026', eventDate: '2026-12-01' },
      AKTOR,
      KONTEKS,
    );

    expect(albums.insert).toHaveBeenCalledWith(tx, {
      slug: 'pensi-sekolah-2026',
      title: 'Pensi Sekolah 2026',
      description: null,
      eventDate: '2026-12-01',
      status: 'draft',
      createdBy: AKTOR.userId,
    });
    expect(audit.recordWithin).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'create', entityType: 'album', entityId: ALBUM_ID }),
    );
  });

  it('mencoba slug berakhiran angka ketika bentrok', async () => {
    let percobaan = 0;
    const { service, albums } = buatService();

    albums.insert.mockImplementation(async () => {
      percobaan += 1;

      if (percobaan < 2) {
        throw UNIQUE;
      }

      return { id: ALBUM_ID };
    });

    await service.create({ title: 'Pensi Sekolah', eventDate: '2026-12-01' }, AKTOR, KONTEKS);

    expect(albums.insert.mock.calls.map((call) => (call[1] as { slug: string }).slug)).toEqual([
      'pensi-sekolah',
      'pensi-sekolah-2',
    ]);
  });

  it('menyerah dengan 409 setelah semua kandidat slug dipakai', async () => {
    const { service } = buatService({ insertError: UNIQUE });

    await expect(
      service.create({ title: 'Pensi Sekolah', eventDate: '2026-12-01' }, AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('AlbumAdminService.update', () => {
  it('melempar 404 ketika album tidak ada', async () => {
    const { service } = buatService({ album: null });

    await expect(
      service.update(ALBUM_ID, { title: 'Judul Baru' }, AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('menolak mengubah album yang diarsipkan', async () => {
    const { service, albums } = buatService({ album: albumRowOf({ status: 'archived' }) });

    await expect(
      service.update(ALBUM_ID, { title: 'Judul Baru' }, AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(albums.update).not.toHaveBeenCalled();
  });

  it('menolak sampul yang bukan milik album ini', async () => {
    const { service } = buatService({ album: albumRowOf(), images: [] });

    await expect(
      service.update(ALBUM_ID, { coverImageId: IMAGE_ID }, AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('menerima sampul yang berasal dari album ini', async () => {
    const { service, albums, tx } = buatService({
      album: albumRowOf(),
      images: [imageRowOf()],
    });

    await service.update(ALBUM_ID, { coverImageId: IMAGE_ID }, AKTOR, KONTEKS);

    expect(albums.update).toHaveBeenCalledWith(
      tx,
      ALBUM_ID,
      expect.objectContaining({ coverImageId: IMAGE_ID }),
    );
  });

  it('mencatat redirect ketika slug berubah', async () => {
    const { service, albums, tx } = buatService();

    await service.update(ALBUM_ID, { slug: 'pensi-baru' }, AKTOR, KONTEKS);

    expect(albums.recordRedirect).toHaveBeenCalledWith(tx, 'pensi-sekolah', ALBUM_ID);
    expect(albums.dropRedirect).toHaveBeenCalledWith(tx, 'pensi-baru');
  });

  it('tidak mencatat redirect ketika slug tetap', async () => {
    const { service, albums } = buatService();

    await service.update(ALBUM_ID, { title: 'Pensi Sekolah' }, AKTOR, KONTEKS);

    expect(albums.recordRedirect).not.toHaveBeenCalled();
  });
});

describe('AlbumAdminService transisi status', () => {
  it('menolak menerbitkan album yang masih punya foto tanpa teks alternatif', async () => {
    const { service, albums } = buatService({ missingAlt: 2 });

    await expect(service.publish(ALBUM_ID, AKTOR, KONTEKS)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(albums.update).not.toHaveBeenCalled();
  });

  it('menerbitkan album dan mengisi waktu terbit', async () => {
    const { service, albums, audit, tx } = buatService();

    await service.publish(ALBUM_ID, AKTOR, KONTEKS);

    expect(albums.update).toHaveBeenCalledWith(
      tx,
      ALBUM_ID,
      expect.objectContaining({ status: 'published', publishedAt: expect.any(String) }),
    );
    expect(audit.recordWithin).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'publish', entityType: 'album' }),
    );
  });

  it('menolak mengarsipkan album draf', async () => {
    const { service } = buatService();

    await expect(service.archive(ALBUM_ID, AKTOR, KONTEKS)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('mengarsipkan album terbit tanpa menghapus waktu terbit', async () => {
    const { service, albums } = buatService({
      album: albumRowOf({ status: 'published', publishedAt: WAKTU }),
    });

    await service.archive(ALBUM_ID, AKTOR, KONTEKS);

    expect(albums.update).toHaveBeenCalledWith(
      expect.anything(),
      ALBUM_ID,
      expect.not.objectContaining({ publishedAt: expect.anything() }),
    );
  });

  it('memulihkan album arsip menjadi draf', async () => {
    const { service, albums, audit } = buatService({
      album: albumRowOf({ status: 'archived', publishedAt: WAKTU }),
    });

    await service.restore(ALBUM_ID, AKTOR, KONTEKS);

    expect(albums.update).toHaveBeenCalledWith(
      expect.anything(),
      ALBUM_ID,
      expect.objectContaining({ status: 'draft' }),
    );
    expect(audit.recordWithin).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'restore' }),
    );
  });
});

describe('AlbumAdminService.uploadImages', () => {
  it('menolak unggahan ke album yang diarsipkan', async () => {
    const { service } = buatService({ album: albumRowOf({ status: 'archived' }) });

    await expect(
      service.uploadImages(ALBUM_ID, [{ originalname: 'a.jpg', buffer: Buffer.alloc(1) }], AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('menyimpan berkas lalu mencatat baris foto dan audit', async () => {
    vi.mocked(processImage).mockResolvedValue({ ok: true, image: processedOf() });

    const { service, images, audit, tx } = buatService({ nextSortOrder: 4 });

    const hasil = await service.uploadImages(
      ALBUM_ID,
      [{ originalname: 'pensi.jpg', buffer: Buffer.alloc(16) }],
      AKTOR,
      KONTEKS,
    );

    expect(hasil).toEqual({
      uploaded: [
        {
          id: expect.any(String),
          width: 1600,
          height: 900,
          altText: null,
          sortOrder: 4,
        },
      ],
      failed: [],
    });
    expect(images.insert).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        albumId: ALBUM_ID,
        mimeType: 'image/webp',
        thumbWidth: 480,
        thumbHeight: 270,
        sortOrder: 4,
      }),
    );
    expect(audit.recordWithin).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'upload', entityType: 'image' }),
    );
  });

  it('memakai nama berkas sistem, bukan nama asli pengguna', async () => {
    vi.mocked(processImage).mockResolvedValue({ ok: true, image: processedOf() });

    const { service, images } = buatService();

    await service.uploadImages(
      ALBUM_ID,
      [{ originalname: 'rapor-budi-2026.jpg', buffer: Buffer.alloc(16) }],
      AKTOR,
      KONTEKS,
    );

    const tersimpan = images.insert.mock.calls[0]?.[1] as { storageKey: string } | undefined;

    expect(tersimpan?.storageKey).not.toContain('rapor');
    expect(tersimpan?.storageKey).toMatch(new RegExp(`^${ALBUM_ID}/[0-9a-f-]{36}\\.webp$`));
  });

  it('melaporkan berkas yang bukan gambar tanpa menghentikan berkas lain', async () => {
    vi.mocked(processImage)
      .mockResolvedValueOnce({ ok: false, reason: 'Isi berkas bukan gambar JPEG, PNG, atau WebP.' })
      .mockResolvedValueOnce({ ok: true, image: processedOf() });

    const { service, images } = buatService();

    const hasil = await service.uploadImages(
      ALBUM_ID,
      [
        { originalname: 'palsu.jpg', buffer: Buffer.alloc(16) },
        { originalname: 'asli.jpg', buffer: Buffer.alloc(16) },
      ],
      AKTOR,
      KONTEKS,
    );

    expect(hasil.uploaded).toHaveLength(1);
    expect(hasil.failed).toEqual([
      { fileName: 'palsu.jpg', reason: 'Isi berkas bukan gambar JPEG, PNG, atau WebP.' },
    ]);
    expect(images.insert).toHaveBeenCalledTimes(1);
  });

  it('melaporkan kegagalan tulis berkas sebagai kegagalan per berkas', async () => {
    vi.mocked(processImage).mockResolvedValue({ ok: true, image: processedOf() });
    vi.mocked(storage.write).mockRejectedValue(new Error('disk penuh'));

    const { service, images } = buatService();

    const hasil = await service.uploadImages(
      ALBUM_ID,
      [{ originalname: 'foto.jpg', buffer: Buffer.alloc(16) }],
      AKTOR,
      KONTEKS,
    );

    expect(hasil.uploaded).toHaveLength(0);
    expect(hasil.failed).toHaveLength(1);
    expect(images.insert).not.toHaveBeenCalled();
  });

  it('membersihkan berkas ketika penyimpanan baris gagal', async () => {
    vi.mocked(processImage).mockResolvedValue({ ok: true, image: processedOf() });

    const { service, images } = buatService();

    images.insert.mockRejectedValue(new Error('basis data mati'));

    await expect(
      service.uploadImages(
        ALBUM_ID,
        [{ originalname: 'foto.jpg', buffer: Buffer.alloc(16) }],
        AKTOR,
        KONTEKS,
      ),
    ).rejects.toThrow('basis data mati');
    expect(storage.remove).toHaveBeenCalledTimes(1);
  });

  it('membuang jalur direktori dari nama berkas yang dilaporkan', async () => {
    vi.mocked(processImage).mockResolvedValue({ ok: false, reason: 'ditolak' });

    const { service } = buatService();

    const hasil = await service.uploadImages(
      ALBUM_ID,
      [{ originalname: '../../etc/passwd', buffer: Buffer.alloc(16) }],
      AKTOR,
      KONTEKS,
    );

    expect(hasil.failed[0]?.fileName).toBe('passwd');
  });
});

describe('AlbumAdminService.updateImageAlt', () => {
  it('menyimpan teks alternatif dan mencatat audit', async () => {
    const { service, images, audit, tx } = buatService({ images: [imageRowOf({ altText: null })] });

    const hasil = await service.updateImageAlt(ALBUM_ID, IMAGE_ID, 'Suasana pensi', AKTOR, KONTEKS);

    expect(images.updateAltText).toHaveBeenCalledWith(tx, ALBUM_ID, IMAGE_ID, 'Suasana pensi');
    expect(audit.recordWithin).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'update', entityType: 'image', entityId: IMAGE_ID }),
    );
    expect(hasil.altText).toBe('Suasana pensi');
  });

  it('melempar 404 ketika foto tidak ada pada album', async () => {
    const { service } = buatService({ images: [] });

    await expect(
      service.updateImageAlt(ALBUM_ID, IMAGE_ID, 'Teks', AKTOR, KONTEKS),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AlbumAdminService.deleteImage', () => {
  it('menolak menghapus foto pada album yang belum diarsipkan', async () => {
    const { service, images } = buatService({ images: [imageRowOf()] });

    await expect(service.deleteImage(ALBUM_ID, IMAGE_ID, AKTOR, KONTEKS)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(images.remove).not.toHaveBeenCalled();
  });

  it('menghapus baris lalu berkas fisik pada album arsip', async () => {
    const { service, images, audit, tx } = buatService({
      album: albumRowOf({ status: 'archived', publishedAt: WAKTU }),
      images: [imageRowOf()],
      removed: { storageKey: `${ALBUM_ID}/${IMAGE_ID}.webp` },
    });

    await service.deleteImage(ALBUM_ID, IMAGE_ID, AKTOR, KONTEKS);

    expect(images.remove).toHaveBeenCalledWith(tx, ALBUM_ID, IMAGE_ID);
    expect(audit.recordWithin).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'delete', entityType: 'image', entityId: IMAGE_ID }),
    );
    expect(storage.remove).toHaveBeenCalledWith({
      master: `${ALBUM_ID}/${IMAGE_ID}.webp`,
      medium: `${ALBUM_ID}/${IMAGE_ID}-sedang.webp`,
      small: `${ALBUM_ID}/${IMAGE_ID}-kecil.webp`,
    });
  });

  it('melempar 404 ketika baris tidak ditemukan saat penghapusan', async () => {
    const { service } = buatService({
      album: albumRowOf({ status: 'archived', publishedAt: WAKTU }),
      removed: undefined,
    });

    await expect(service.deleteImage(ALBUM_ID, IMAGE_ID, AKTOR, KONTEKS)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('tidak menggagalkan permintaan ketika berkas fisik tidak dapat dihapus', async () => {
    vi.mocked(storage.remove).mockRejectedValue(new Error('izin ditolak'));

    const { service } = buatService({
      album: albumRowOf({ status: 'archived', publishedAt: WAKTU }),
      removed: { storageKey: `${ALBUM_ID}/${IMAGE_ID}.webp` },
    });

    await expect(service.deleteImage(ALBUM_ID, IMAGE_ID, AKTOR, KONTEKS)).resolves.toBeUndefined();
  });
});

describe('AlbumAdminService.list', () => {
  it('menyertakan jumlah foto per album', async () => {
    const { service, albums } = buatService();

    albums.findPage.mockResolvedValue({ rows: [albumRowOf()], total: 1 });

    const hasil = await service.list({ page: 1, perPage: 20 });

    expect(hasil.items[0]?.imageCount).toBe(0);
    expect(hasil.meta).toEqual({ page: 1, perPage: 20, total: 1, totalPages: 1 });
  });
});
