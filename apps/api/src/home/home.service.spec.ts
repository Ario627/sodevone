import { describe, expect, it, vi } from 'vitest';
import type { EventCollection } from '@kelas/contracts';
import { AnnouncementService } from '../announcement/announcement.service.js';
import type { EventService } from '../event/event.service.js';
import { AlbumService } from '../gallery/album.service.js';
import type { AlbumSummary } from '@kelas/contracts';
import { HomeService } from './home.service.js';

const WAKTU = '2026-10-30T07:05:00.000Z';

const agenda = (slug: string) => ({
  slug,
  title: `Kegiatan ${slug}`,
  startsAt: WAKTU,
  endsAt: null,
  location: null,
  state: 'published' as const,
});

const album = (slug: string): AlbumSummary => ({
  slug,
  title: `Album ${slug}`,
  description: null,
  eventDate: '2026-10-20',
  state: 'published',
  cover: null,
  imageCount: 0,
  publishedAt: WAKTU,
});

function buatService(nilai: {
  announcements?: unknown;
  events?: EventCollection;
  albums?: AlbumSummary[];
}): HomeService {
  const { announcements, events, albums } = nilai;

  return new HomeService(
    { list: vi.fn().mockResolvedValue(announcements) } as unknown as AnnouncementService,
    { collection: vi.fn().mockResolvedValue(events) } as unknown as EventService,
    { latest: vi.fn().mockResolvedValue(albums) } as unknown as AlbumService,
  );
}

describe('HomeService', () => {
  it('membatasi agenda mendatang menjadi tiga meski sumbernya lebih banyak', async () => {
    const service = buatService({
      announcements: { items: [], meta: { page: 1, perPage: 5, total: 0, totalPages: 0 } },
      events: { upcoming: [agenda('a'), agenda('b'), agenda('c'), agenda('d')], past: [] },
      albums: [],
    });

    const hasil = await service.overview();

    expect(hasil.upcomingEvents).toHaveLength(3);
    expect(hasil.upcomingEvents.map((item) => item.slug)).toEqual(['a', 'b', 'c']);
  });

  it('tidak pernah menyertakan agenda lampau di beranda', async () => {
    const service = buatService({
      announcements: { items: [], meta: { page: 1, perPage: 5, total: 0, totalPages: 0 } },
      events: { upcoming: [], past: [agenda('lampau')] },
      albums: [],
    });

    const hasil = await service.overview();

    expect(hasil.upcomingEvents).toEqual([]);
  });

  it('mempertahankan urutan yang sudah ditentukan layanan sumber', async () => {
    const service = buatService({
      announcements: { items: [], meta: { page: 1, perPage: 5, total: 0, totalPages: 0 } },
      events: { upcoming: [], past: [] },
      albums: [album('paling-baru'), album('berikutnya'), album('ketiga')],
    });

    const hasil = await service.overview();

    expect(hasil.albums.map((item) => item.slug)).toEqual(['paling-baru', 'berikutnya', 'ketiga']);
  });

  it('mengirim hasil kosong sebagai larik kosong, bukan null', async () => {
    const service = buatService({
      announcements: { items: [], meta: { page: 1, perPage: 5, total: 0, totalPages: 0 } },
      events: { upcoming: [], past: [] },
      albums: [],
    });

    const hasil = await service.overview();

    expect(hasil).toEqual({ announcements: [], upcomingEvents: [], albums: [] });
  });

  it('meminta pengumuman terbit saja dengan jumlah lima', async () => {
    const list = vi.fn().mockResolvedValue({
      items: [],
      meta: { page: 1, perPage: 5, total: 0, totalPages: 0 },
    });

    const service = new HomeService(
      { list } as unknown as AnnouncementService,
      {
        collection: vi.fn().mockResolvedValue({ upcoming: [], past: [] } as EventCollection),
      } as unknown as EventService,
      { latest: vi.fn().mockResolvedValue([]) } as unknown as AlbumService,
    );

    await service.overview();

    expect(list).toHaveBeenCalledWith({ page: 1, perPage: 5, arsip: false });
  });

  it('meminta album terbaru sebanyak tiga', async () => {
    const latest = vi.fn().mockResolvedValue([]);

    const service = new HomeService(
      {
        list: vi
          .fn()
          .mockResolvedValue({ items: [], meta: { page: 1, perPage: 5, total: 0, totalPages: 0 } }),
      } as unknown as AnnouncementService,
      {
        collection: vi.fn().mockResolvedValue({ upcoming: [], past: [] } as EventCollection),
      } as unknown as EventService,
      { latest } as unknown as AlbumService,
    );

    await service.overview();

    expect(latest).toHaveBeenCalledWith(3);
  });

  it('memakai satu kali permintaan agenda untuk beranda', async () => {
    const collection = vi.fn().mockResolvedValue({ upcoming: [], past: [] } as EventCollection);

    const service = new HomeService(
      {
        list: vi
          .fn()
          .mockResolvedValue({ items: [], meta: { page: 1, perPage: 5, total: 0, totalPages: 0 } }),
      } as unknown as AnnouncementService,
      { collection } as unknown as EventService,
      { latest: vi.fn().mockResolvedValue([]) } as unknown as AlbumService,
    );

    await service.overview();

    expect(collection).toHaveBeenCalledTimes(1);
  });
});
