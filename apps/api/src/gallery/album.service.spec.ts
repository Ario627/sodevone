import { describe, expect, it, vi } from 'vitest';
import type { AlbumRepository } from './album.repository.js';
import type { AlbumImageRow, AlbumPublicRow } from './album.repository.js';
import { AlbumService } from './album.service.js';

const WAKTU = '2026-10-20 02:00:00+00';

const WAKTU_ISO = '2026-10-20T02:00:00.000Z';

const ALBUM_ID = '11111111-1111-4111-8111-111111111111';

const COVER_ID = '22222222-2222-4222-8222-222222222222';

function albumOf(overrides: Partial<AlbumPublicRow> = {}): AlbumPublicRow {
  return {
    id: ALBUM_ID,
    slug: 'pensi-2026',
    title: 'Pensi 2026',
    description: 'Dokumentasi pensi.',
    eventDate: '2026-10-20',
    status: 'published',
    coverImageId: null,
    publishedAt: WAKTU,
    ...overrides,
  };
}

function imageOf(overrides: Partial<AlbumImageRow> = {}): AlbumImageRow {
  return {
    id: COVER_ID,
    width: 1024,
    height: 768,
    altText: 'Foto kelas',
    sortOrder: 0,
    ...overrides,
  };
}

function buatService(repository: Partial<AlbumRepository>) {
  return new AlbumService(repository as AlbumRepository);
}

const QUERY = { page: 1, perPage: 24 };

describe('AlbumService.list', () => {
  it('memetakan album menjadi ringkasan publik tanpa kolom internal', async () => {
    const findPage = vi.fn().mockResolvedValue({ rows: [albumOf()], total: 1 });
    const hasil = await buatService({
      findPage,
      findCoverImage: vi.fn(),
      countImages: vi.fn().mockResolvedValue(new Map()),
      findDefaultCovers: vi.fn().mockResolvedValue(new Map()),
    }).list(1, 12);

    expect(hasil.items).toEqual([
      {
        slug: 'pensi-2026',
        title: 'Pensi 2026',
        description: 'Dokumentasi pensi.',
        eventDate: '2026-10-20',
        state: 'published',
        cover: null,
        imageCount: 0,
        publishedAt: WAKTU_ISO,
      },
    ]);
    expect(hasil.items[0]).not.toHaveProperty('id');
    expect(hasil.items[0]).not.toHaveProperty('status');
    expect(hasil.items[0]).not.toHaveProperty('coverImageId');
    expect(hasil.meta).toEqual({ page: 1, perPage: 12, total: 1, totalPages: 1 });
  });

  it('tidak meminta sampul saat album belum menetapkannya', async () => {
    const findCoverImage = vi.fn();
    const findPage = vi.fn().mockResolvedValue({ rows: [albumOf()], total: 1 });

    await buatService({
      findPage,
      findCoverImage,
      countImages: vi.fn().mockResolvedValue(new Map()),
      findDefaultCovers: vi.fn().mockResolvedValue(new Map()),
    }).list(1, 12);

    expect(findCoverImage).not.toHaveBeenCalled();
  });

  it('memuat sampul hanya untuk album yang menetapkannya', async () => {
    const findCoverImage = vi.fn().mockResolvedValue(imageOf());
    const findPage = vi
      .fn()
      .mockResolvedValue({ rows: [albumOf({ coverImageId: COVER_ID })], total: 1 });

    const hasil = await buatService({
      findPage,
      findCoverImage,
      countImages: vi.fn().mockResolvedValue(new Map([[ALBUM_ID, 3]])),
      findDefaultCovers: vi.fn().mockResolvedValue(new Map()),
    }).list(1, 12);

    expect(findCoverImage).toHaveBeenCalledWith(ALBUM_ID, COVER_ID);
    expect(hasil.items[0]?.imageCount).toBe(3);
    expect(hasil.items[0]?.cover?.id).toBe(COVER_ID);
  });

  it('menampilkan sampul kosong bila baris sampul sudah hilang', async () => {
    const findCoverImage = vi.fn().mockResolvedValue(undefined);
    const findPage = vi
      .fn()
      .mockResolvedValue({ rows: [albumOf({ coverImageId: COVER_ID })], total: 1 });

    const hasil = await buatService({
      findPage,
      findCoverImage,
      countImages: vi.fn().mockResolvedValue(new Map()),
      findDefaultCovers: vi.fn().mockResolvedValue(new Map()),
    }).list(1, 12);

    expect(hasil.items[0]?.cover).toBeNull();
  });

  it('memakai foto pertama sebagai sampul bila album belum menetapkan sampul', async () => {
    const findDefaultCovers = vi
      .fn()
      .mockResolvedValue(new Map([[ALBUM_ID, imageOf({ sortOrder: 0 })]]));
    const findPage = vi.fn().mockResolvedValue({ rows: [albumOf()], total: 1 });

    const hasil = await buatService({
      findPage,
      findCoverImage: vi.fn(),
      countImages: vi.fn().mockResolvedValue(new Map([[ALBUM_ID, 2]])),
      findDefaultCovers,
    }).list(1, 12);

    expect(findDefaultCovers).toHaveBeenCalledWith([ALBUM_ID]);
    expect(hasil.items[0]?.cover?.id).toBe(COVER_ID);
  });

  it('mengambil sampul cadangan untuk semua album tanpa sampul dalam satu kueri', async () => {
    const lain = '33333333-3333-4333-8333-333333333333';
    const findDefaultCovers = vi.fn().mockResolvedValue(new Map());
    const findPage = vi.fn().mockResolvedValue({
      rows: [albumOf(), albumOf({ id: lain, slug: 'kerja-bakti' })],
      total: 2,
    });

    await buatService({
      findPage,
      findCoverImage: vi.fn(),
      countImages: vi.fn().mockResolvedValue(new Map()),
      findDefaultCovers,
    }).list(1, 12);

    expect(findDefaultCovers).toHaveBeenCalledTimes(1);
    expect(findDefaultCovers).toHaveBeenCalledWith([ALBUM_ID, lain]);
  });

  it('tidak memakai sampul cadangan untuk album yang sudah menetapkannya', async () => {
    const findDefaultCovers = vi.fn().mockResolvedValue(new Map());
    const findPage = vi
      .fn()
      .mockResolvedValue({ rows: [albumOf({ coverImageId: COVER_ID })], total: 1 });

    await buatService({
      findPage,
      findCoverImage: vi.fn().mockResolvedValue(imageOf()),
      countImages: vi.fn().mockResolvedValue(new Map()),
      findDefaultCovers,
    }).list(1, 12);

    expect(findDefaultCovers).toHaveBeenCalledWith([]);
  });

  it('menandai album arsip sebagai arsip', async () => {
    const findPage = vi
      .fn()
      .mockResolvedValue({ rows: [albumOf({ status: 'archived' })], total: 1 });

    const hasil = await buatService({
      findPage,
      findCoverImage: vi.fn(),
      countImages: vi.fn().mockResolvedValue(new Map()),
      findDefaultCovers: vi.fn().mockResolvedValue(new Map()),
    }).list(1, 12);

    expect(hasil.items[0]?.state).toBe('archived');
  });

  it('menolak album publik tanpa tanggal terbit', async () => {
    const findPage = vi
      .fn()
      .mockResolvedValue({ rows: [albumOf({ publishedAt: null })], total: 1 });

    await expect(
      buatService({
        findPage,
        findCoverImage: vi.fn(),
        countImages: vi.fn().mockResolvedValue(new Map()),
        findDefaultCovers: vi.fn().mockResolvedValue(new Map()),
      }).list(1, 12),
    ).rejects.toThrow(/published_at/);
  });

  it('melaporkan nol halaman saat tidak ada album', async () => {
    const findPage = vi.fn().mockResolvedValue({ rows: [], total: 0 });

    const hasil = await buatService({
      findPage,
      findCoverImage: vi.fn(),
      countImages: vi.fn().mockResolvedValue(new Map()),
      findDefaultCovers: vi.fn().mockResolvedValue(new Map()),
    }).list(1, 12);

    expect(hasil.items).toEqual([]);
    expect(hasil.meta.totalPages).toBe(0);
  });
});

describe('AlbumService.latest', () => {
  it('meneruskan batas ke repository', async () => {
    const findLatest = vi.fn().mockResolvedValue([]);

    await buatService({
      findLatest,
      findCoverImage: vi.fn(),
      countImages: vi.fn().mockResolvedValue(new Map()),
      findDefaultCovers: vi.fn().mockResolvedValue(new Map()),
    }).latest(3);

    expect(findLatest).toHaveBeenCalledWith(3);
  });
});

describe('AlbumService.detail', () => {
  it('membungkus foto dalam paginasi dengan total dari jumlah foto album', async () => {
    const repository: Partial<AlbumRepository> = {
      findVisibleBySlug: vi.fn().mockResolvedValue(albumOf()),
      findCoverImage: vi.fn().mockResolvedValue(undefined),
      countImages: vi.fn().mockResolvedValue(new Map([[ALBUM_ID, 30]])),
      findDefaultCovers: vi.fn().mockResolvedValue(new Map()),
      findImages: vi.fn().mockResolvedValue([imageOf({ id: COVER_ID })]),
    };

    const hasil = await buatService(repository).detail('pensi-2026', QUERY);

    expect(hasil.kind).toBe('found');

    if (hasil.kind !== 'found') {
      throw new Error('jenis hasil tidak sesuai');
    }

    expect(hasil.detail.images.items).toHaveLength(1);
    expect(hasil.detail.images.meta).toEqual({
      page: 1,
      perPage: 24,
      total: 30,
      totalPages: 2,
    });
  });

  it('meneruskan nomor halaman foto ke repository', async () => {
    const findImages = vi.fn().mockResolvedValue([]);
    const repository: Partial<AlbumRepository> = {
      findVisibleBySlug: vi.fn().mockResolvedValue(albumOf()),
      findCoverImage: vi.fn(),
      countImages: vi.fn().mockResolvedValue(new Map()),
      findDefaultCovers: vi.fn().mockResolvedValue(new Map()),
      findImages,
    };

    await buatService(repository).detail('pensi-2026', { page: 2, perPage: 12 });

    expect(findImages).toHaveBeenCalledWith(ALBUM_ID, 2, 12);
  });

  it('melaporkan hilang saat slug tidak dikenal', async () => {
    const repository: Partial<AlbumRepository> = {
      findVisibleBySlug: vi.fn().mockResolvedValue(undefined),
      findRedirectTargetId: vi.fn().mockResolvedValue(undefined),
    };

    const hasil = await buatService(repository).detail('tidak-ada', QUERY);

    expect(hasil).toEqual({ kind: 'missing' });
  });

  it('melaporkan pindah dengan slug tujuan yang benar', async () => {
    const repository: Partial<AlbumRepository> = {
      findVisibleBySlug: vi.fn().mockResolvedValue(undefined),
      findRedirectTargetId: vi.fn().mockResolvedValue(ALBUM_ID),
      findVisibleById: vi.fn().mockResolvedValue(albumOf({ slug: 'slug-baru' })),
      findCoverImage: vi.fn(),
      countImages: vi.fn().mockResolvedValue(new Map()),
      findDefaultCovers: vi.fn().mockResolvedValue(new Map()),
      findImages: vi.fn().mockResolvedValue([]),
    };

    const hasil = await buatService(repository).detail('slug-lama', QUERY);

    expect(hasil.kind).toBe('moved');

    if (hasil.kind !== 'moved') {
      throw new Error('jenis hasil tidak sesuai');
    }

    expect(hasil.slug).toBe('slug-baru');
  });

  it('melaporkan hilang saat tujuan redirect sudah tidak terlihat', async () => {
    const repository: Partial<AlbumRepository> = {
      findVisibleBySlug: vi.fn().mockResolvedValue(undefined),
      findRedirectTargetId: vi.fn().mockResolvedValue(ALBUM_ID),
      findVisibleById: vi.fn().mockResolvedValue(undefined),
    };

    const hasil = await buatService(repository).detail('slug-lama', QUERY);

    expect(hasil).toEqual({ kind: 'missing' });
  });

  it('tidak mencari redirect saat slug langsung ditemukan', async () => {
    const findRedirectTargetId = vi.fn();
    const repository: Partial<AlbumRepository> = {
      findVisibleBySlug: vi.fn().mockResolvedValue(albumOf()),
      findRedirectTargetId,
      findCoverImage: vi.fn(),
      countImages: vi.fn().mockResolvedValue(new Map()),
      findDefaultCovers: vi.fn().mockResolvedValue(new Map()),
      findImages: vi.fn().mockResolvedValue([]),
    };

    await buatService(repository).detail('pensi-2026', QUERY);

    expect(findRedirectTargetId).not.toHaveBeenCalled();
  });
});
