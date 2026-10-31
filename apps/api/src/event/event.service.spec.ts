import { describe, expect, it, vi } from 'vitest';
import { EventRepository } from './event.repository.js';
import type { EventPublicRow } from './event.repository.js';
import { EventService } from './event.service.js';

const MULAI = '2026-11-02 03:00:00+00';

const MULAI_ISO = '2026-11-02T03:00:00.000Z';

function rowOf(overrides: Partial<EventPublicRow> = {}): EventPublicRow {
  return {
    id: 'a1b2c3d4-1111-4222-8333-444455556666',
    slug: 'kerja-bakti-kelas',
    title: 'Kerja bakti kelas',
    description: 'Membersihkan ruang kelas bersama.',
    location: 'Ruang XI PPLG 1',
    startsAt: MULAI,
    endsAt: null,
    status: 'published',
    ...overrides,
  };
}

function buatService(repository: Partial<EventRepository>) {
  return new EventService(repository as EventRepository);
}

describe('EventService.collection', () => {
  it('memisahkan kegiatan mendatang dan lampau tanpa kolom internal', async () => {
    const findUpcoming = vi.fn().mockResolvedValue([rowOf()]);
    const findPast = vi.fn().mockResolvedValue([rowOf({ slug: 'pensi-2025', status: 'archived' })]);

    const hasil = await buatService({ findUpcoming, findPast }).collection();

    expect(hasil.upcoming).toEqual([
      {
        slug: 'kerja-bakti-kelas',
        title: 'Kerja bakti kelas',
        startsAt: MULAI_ISO,
        endsAt: null,
        location: 'Ruang XI PPLG 1',
        state: 'published',
      },
    ]);
    expect(hasil.past[0]?.state).toBe('archived');

    const pertama = hasil.upcoming[0];

    expect(pertama).not.toHaveProperty('description');
    expect(pertama).not.toHaveProperty('id');
    expect(pertama).not.toHaveProperty('status');
  });

  it('memakai satu batas waktu yang sama untuk kedua kueri', async () => {
    const findUpcoming = vi.fn().mockResolvedValue([]);
    const findPast = vi.fn().mockResolvedValue([]);

    await buatService({ findUpcoming, findPast }).collection();

    const batasMendatang = findUpcoming.mock.calls[0]?.[0];
    const batasLampau = findPast.mock.calls[0]?.[0];

    expect(batasMendatang).toBeDefined();
    expect(batasMendatang).toBe(batasLampau);
    expect(findUpcoming.mock.calls[0]?.[1]).toBe(20);
    expect(findPast.mock.calls[0]?.[1]).toBe(20);
  });
});

describe('EventService.detail', () => {
  it('mengembalikan detail yang sudah dinormalkan ke ISO', async () => {
    const findVisibleBySlug = vi.fn().mockResolvedValue(rowOf());

    const hasil = await buatService({ findVisibleBySlug }).detail('kerja-bakti-kelas');

    expect(hasil).toEqual({
      kind: 'found',
      detail: {
        slug: 'kerja-bakti-kelas',
        title: 'Kerja bakti kelas',
        startsAt: MULAI_ISO,
        endsAt: null,
        location: 'Ruang XI PPLG 1',
        state: 'published',
        description: 'Membersihkan ruang kelas bersama.',
      },
    });
  });

  it('melaporkan slug lama sebagai pindah ke slug baru', async () => {
    const findVisibleBySlug = vi.fn().mockResolvedValue(undefined);
    const findRedirectTargetId = vi.fn().mockResolvedValue('a1b2c3d4-1111-4222-8333-444455556666');
    const findVisibleById = vi
      .fn()
      .mockResolvedValue(rowOf({ slug: 'kerja-bakti-baru' }));

    const hasil = await buatService({
      findVisibleBySlug,
      findRedirectTargetId,
      findVisibleById,
    }).detail('kerja-bakti-lama');

    expect(hasil.kind).toBe('moved');
    expect(hasil.kind === 'moved' ? hasil.slug : '').toBe('kerja-bakti-baru');
  });

  it('melaporkan tidak ditemukan saat slug maupun redirect tidak ada', async () => {
    const hasil = await buatService({
      findVisibleBySlug: vi.fn().mockResolvedValue(undefined),
      findRedirectTargetId: vi.fn().mockResolvedValue(undefined),
    }).detail('tidak-ada');

    expect(hasil).toEqual({ kind: 'missing' });
  });

  it('melaporkan tidak ditemukan saat target redirect tidak lagi terlihat', async () => {
    const hasil = await buatService({
      findVisibleBySlug: vi.fn().mockResolvedValue(undefined),
      findRedirectTargetId: vi.fn().mockResolvedValue('a1b2c3d4-1111-4222-8333-444455556666'),
      findVisibleById: vi.fn().mockResolvedValue(undefined),
    }).detail('kerja-bakti-lama');

    expect(hasil).toEqual({ kind: 'missing' });
  });
});
