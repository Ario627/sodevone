import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../db/database.service.js';
import type { AnnouncementAttachmentRepository } from './announcement-attachment.repository.js';
import { AnnouncementRepository } from './announcement.repository.js';
import type { AnnouncementPublicRow } from './announcement.repository.js';
import { AnnouncementService } from './announcement.service.js';

const WAKTU = '2026-10-30 07:05:00+00';

const WAKTU_ISO = '2026-10-30T07:05:00.000Z';

function rowOf(overrides: Partial<AnnouncementPublicRow> = {}): AnnouncementPublicRow {
  return {
    id: '8f14e45f-ceea-467f-a8d3-1b7c1e1d9b21',
    slug: 'perubahan-jadwal-ujian',
    title: 'Perubahan jadwal ujian',
    excerpt: 'Ujian dimulai pukul 07.30.',
    body: 'Ujian **praktik** dimulai pukul 07.30.',
    category: 'akademik',
    status: 'published',
    isPinned: false,
    publishedAt: WAKTU,
    updatedAt: WAKTU,
    ...overrides,
  };
}

function buatService(
  repository: Partial<AnnouncementRepository>,
  attachments: Partial<AnnouncementAttachmentRepository> = {},
) {
  const findMany = vi.fn().mockResolvedValue([]);

  return new AnnouncementService(
    repository as AnnouncementRepository,
    { findMany, ...attachments } as unknown as AnnouncementAttachmentRepository,
    { db: {} } as unknown as DatabaseService,
  );
}

const KOSONG = { page: 1, perPage: 10, arsip: false };

describe('AnnouncementService.list', () => {
  it('memetakan baris menjadi ringkasan publik tanpa kolom internal', async () => {
    const findPage = vi.fn().mockResolvedValue({ rows: [rowOf()], total: 1 });
    const hasil = await buatService({ findPage }).list(KOSONG);

    expect(hasil.items).toEqual([
      {
        slug: 'perubahan-jadwal-ujian',
        title: 'Perubahan jadwal ujian',
        excerpt: 'Ujian dimulai pukul 07.30.',
        category: 'akademik',
        state: 'published',
        isPinned: false,
        publishedAt: WAKTU_ISO,
      },
    ]);
    expect(hasil.items[0]).not.toHaveProperty('status');
    expect(hasil.items[0]).not.toHaveProperty('body');
    expect(hasil.items[0]).not.toHaveProperty('id');
  });

  it('meneruskan filter ke repository', async () => {
    const findPage = vi.fn().mockResolvedValue({ rows: [], total: 0 });

    await buatService({ findPage }).list({
      page: 3,
      perPage: 25,
      kategori: 'kegiatan',
      q: 'pensi',
      arsip: true,
    });

    expect(findPage).toHaveBeenCalledWith({
      page: 3,
      perPage: 25,
      category: 'kegiatan',
      search: 'pensi',
      includeArchived: true,
    });
  });

  it('menghitung total halaman dengan pembulatan ke atas', async () => {
    const findPage = vi.fn().mockResolvedValue({ rows: [], total: 21 });
    const hasil = await buatService({ findPage }).list(KOSONG);

    expect(hasil.meta).toEqual({ page: 1, perPage: 10, total: 21, totalPages: 3 });
  });

  it('melaporkan nol halaman saat tidak ada data', async () => {
    const findPage = vi.fn().mockResolvedValue({ rows: [], total: 0 });
    const hasil = await buatService({ findPage }).list(KOSONG);

    expect(hasil.items).toEqual([]);
    expect(hasil.meta.totalPages).toBe(0);
  });

  it('menandai baris arsip sebagai arsip, bukan terbit', async () => {
    const findPage = vi.fn().mockResolvedValue({ rows: [rowOf({ status: 'archived' })], total: 1 });
    const hasil = await buatService({ findPage }).list({ ...KOSONG, arsip: true });

    expect(hasil.items[0]?.state).toBe('archived');
  });

  it('menolak baris publik tanpa tanggal terbit alih-alih mengarang nilai', async () => {
    const findPage = vi.fn().mockResolvedValue({ rows: [rowOf({ publishedAt: null })], total: 1 });

    await expect(buatService({ findPage }).list(KOSONG)).rejects.toThrow(/published_at/);
  });
});

describe('AnnouncementService.detail', () => {
  it('mengembalikan detail dengan isi yang sudah dirender', async () => {
    const hasil = await buatService({
      findVisibleBySlug: vi.fn().mockResolvedValue(rowOf()),
    }).detail('perubahan-jadwal-ujian');

    expect(hasil.kind).toBe('found');

    if (hasil.kind !== 'found') {
      throw new Error('jenis hasil tidak sesuai');
    }

    expect(hasil.detail.bodyHtml).toContain('<strong>praktik</strong>');
    expect(hasil.detail.bodyHtml).not.toContain('**');
    expect(hasil.detail).not.toHaveProperty('body');
    expect(hasil.detail.authorName).toBeNull();
    expect(hasil.detail.updatedAt).toBe(WAKTU_ISO);
  });

  it('melaporkan hilang saat slug tidak dikenal', async () => {
    const hasil = await buatService({
      findVisibleBySlug: vi.fn().mockResolvedValue(undefined),
      findRedirectTargetId: vi.fn().mockResolvedValue(undefined),
    }).detail('tidak-ada');

    expect(hasil).toEqual({ kind: 'missing' });
  });

  it('melaporkan pindah saat slug lama menunjuk pengumuman yang masih terlihat', async () => {
    const hasil = await buatService({
      findVisibleBySlug: vi.fn().mockResolvedValue(undefined),
      findRedirectTargetId: vi.fn().mockResolvedValue('8f14e45f-ceea-467f-a8d3-1b7c1e1d9b21'),
      findVisibleById: vi.fn().mockResolvedValue(rowOf({ slug: 'slug-baru' })),
    }).detail('slug-lama');

    expect(hasil.kind).toBe('moved');

    if (hasil.kind !== 'moved') {
      throw new Error('jenis hasil tidak sesuai');
    }

    expect(hasil.slug).toBe('slug-baru');
  });

  it('melaporkan hilang saat tujuan redirect sudah tidak terlihat', async () => {
    const hasil = await buatService({
      findVisibleBySlug: vi.fn().mockResolvedValue(undefined),
      findRedirectTargetId: vi.fn().mockResolvedValue('8f14e45f-ceea-467f-a8d3-1b7c1e1d9b21'),
      findVisibleById: vi.fn().mockResolvedValue(undefined),
    }).detail('slug-lama');

    expect(hasil).toEqual({ kind: 'missing' });
  });

  it('tidak mencari redirect saat slug langsung ditemukan', async () => {
    const findRedirectTargetId = vi.fn();

    await buatService({
      findVisibleBySlug: vi.fn().mockResolvedValue(rowOf()),
      findRedirectTargetId,
    }).detail('perubahan-jadwal-ujian');

    expect(findRedirectTargetId).not.toHaveBeenCalled();
  });
});
