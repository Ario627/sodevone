import { describe, expect, it } from 'vitest';
import {
  AdminPasswordSchema,
  AdminUserUpdateSchema,
  AdminUsernameSchema,
  AlbumDetailSchema,
  AlbumUpdateSchema,
  AnnouncementCreateSchema,
  AnnouncementDetailSchema,
  AnnouncementUpdateSchema,
  EventCollectionSchema,
  EventCreateSchema,
  ImageUploadResultSchema,
  IMAGE_INPUT_MIME_TYPES,
  IMAGE_STORED_MIME_TYPES,
  LoginRequestSchema,
  MAX_IMAGE_UPLOAD_BYTES,
  MEDIA_VARIANT_WIDTHS,
} from './index.js';

const WAKTU = '2026-10-30T07:05:00.000Z';

describe('AnnouncementDetailSchema', () => {
  const detail = {
    slug: 'perubahan-jadwal-ujian-besok',
    title: 'Perubahan jadwal ujian besok',
    excerpt: 'Ujian praktik dimulai pukul 07.30.',
    category: 'akademik',
    state: 'published',
    publishedAt: WAKTU,
    bodyHtml: '<p>Ujian praktik dimulai pukul 07.30.</p>',
    authorName: 'Rangga',
    updatedAt: WAKTU,
  };

  it('membuang isi Markdown mentah dari respons publik', () => {
    const parsed = AnnouncementDetailSchema.parse({ ...detail, body: 'Isi mentah rahasia' });

    expect(parsed).not.toHaveProperty('body');
    expect(parsed.bodyHtml).toContain('Ujian praktik');
  });

  it('menerima penulis yang disembunyikan', () => {
    expect(AnnouncementDetailSchema.parse({ ...detail, authorName: null }).authorName).toBeNull();
  });

  it('tidak pernah menerima status draf pada respons publik', () => {
    expect(AnnouncementDetailSchema.safeParse({ ...detail, state: 'draft' }).success).toBe(false);
  });
});

describe('AnnouncementCreateSchema', () => {
  it('menerima isian minimal dan membiarkan kategori ke nilai bawaan layanan', () => {
    const parsed = AnnouncementCreateSchema.parse({
      title: 'Libur kegiatan',
      body: 'Kegiatan diliburkan.',
    });

    expect(parsed).not.toHaveProperty('category');
  });

  it('menolak judul terlalu pendek dan properti asing', () => {
    expect(AnnouncementCreateSchema.safeParse({ title: 'ab', body: 'Isi' }).success).toBe(false);
    expect(
      AnnouncementCreateSchema.safeParse({ title: 'Judul benar', body: 'Isi', status: 'published' })
        .success,
    ).toBe(false);
  });

  it('menolak isi melebihi batas', () => {
    expect(
      AnnouncementCreateSchema.safeParse({ title: 'Judul benar', body: 'a'.repeat(16_001) })
        .success,
    ).toBe(false);
  });
});

describe('AnnouncementUpdateSchema', () => {
  it('menolak perubahan kosong', () => {
    expect(AnnouncementUpdateSchema.safeParse({}).success).toBe(false);
  });

  it('menerima satu field saja', () => {
    expect(AnnouncementUpdateSchema.safeParse({ title: 'Judul baru' }).success).toBe(true);
  });
});

describe('EventCreateSchema', () => {
  it('menolak waktu selesai lebih awal dari waktu mulai', () => {
    const result = EventCreateSchema.safeParse({
      title: 'Kerja kelompok',
      startsAt: '2026-11-02T03:00:00.000Z',
      endsAt: '2026-11-02T01:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });

  it('menerima kegiatan tanpa waktu selesai', () => {
    expect(EventCreateSchema.safeParse({ title: 'Kerja kelompok', startsAt: WAKTU }).success).toBe(
      true,
    );
  });
});

describe('EventCollectionSchema', () => {
  it('memisahkan agenda mendatang dan lampau dalam satu respons', () => {
    const agenda = {
      slug: 'kerja-kelompok',
      title: 'Kerja kelompok',
      startsAt: WAKTU,
      endsAt: null,
      location: null,
      state: 'published',
    };

    const parsed = EventCollectionSchema.parse({ upcoming: [agenda], past: [] });

    expect(parsed.upcoming).toHaveLength(1);
    expect(parsed.past).toHaveLength(0);
  });
});

describe('AlbumDetailSchema', () => {
  const album = {
    slug: 'pensi-2026',
    title: 'Pensi 2026',
    description: null,
    eventDate: '2026-10-20',
    state: 'published',
    cover: null,
    imageCount: 1,
    publishedAt: WAKTU,
  };

  it('membungkus foto dalam paginasi, bukan larik telanjang', () => {
    const parsed = AlbumDetailSchema.parse({
      ...album,
      images: {
        items: [
          {
            id: '2f1c1d84-3c0f-4d3e-9f1a-8c1c2b3d4e5f',
            width: 1024,
            height: 768,
            altText: 'Foto kelas',
            sortOrder: 0,
          },
        ],
        meta: { page: 1, perPage: 24, total: 1, totalPages: 1 },
      },
    });

    expect(parsed.images.items).toHaveLength(1);
    expect(parsed.images.meta.perPage).toBe(24);
  });

  it('menolak lebar melebihi batas dimensi', () => {
    expect(
      AlbumDetailSchema.safeParse({
        ...album,
        images: {
          items: [
            {
              id: '2f1c1d84-3c0f-4d3e-9f1a-8c1c2b3d4e5f',
              width: 6001,
              height: 10,
              altText: null,
              sortOrder: 0,
            },
          ],
          meta: { page: 1, perPage: 24, total: 1, totalPages: 1 },
        },
      }).success,
    ).toBe(false);
  });
});

describe('AlbumUpdateSchema', () => {
  it('menolak perubahan kosong', () => {
    expect(AlbumUpdateSchema.safeParse({}).success).toBe(false);
  });
});

describe('kebijakan berkas gambar', () => {
  it('membedakan format masuk dan format tersimpan', () => {
    expect(IMAGE_INPUT_MIME_TYPES).toContain('image/png');
    expect(IMAGE_STORED_MIME_TYPES).not.toContain('image/png');
    expect(IMAGE_STORED_MIME_TYPES).toEqual(['image/jpeg', 'image/webp']);
  });

  it('menetapkan batas unggah 5 MB sesuai kebijakan media', () => {
    expect(MAX_IMAGE_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
  });

  it('menetapkan lebar turunan kecil 480 dan sedang 1024', () => {
    expect(MEDIA_VARIANT_WIDTHS).toEqual({ kecil: 480, sedang: 1024 });
  });

  it('menerima hasil unggah sebagian berhasil', () => {
    const parsed = ImageUploadResultSchema.parse({
      uploaded: [],
      failed: [{ fileName: 'foto.jpg', reason: 'Berkas gambar tidak dapat dibaca' }],
    });

    expect(parsed.failed).toHaveLength(1);
  });

  it('menolak nama berkas dengan karakter kendali', () => {
    expect(
      ImageUploadResultSchema.safeParse({
        uploaded: [],
        failed: [{ fileName: 'foto\n.jpg', reason: 'x' }],
      }).success,
    ).toBe(false);
  });
});

describe('LoginRequestSchema', () => {
  it('menormalkan nama pengguna menjadi huruf kecil', () => {
    const parsed = LoginRequestSchema.parse({ username: '  Rangga.Ketua ', password: 'apa saja' });

    expect(parsed.username).toBe('rangga.ketua');
  });

  it('tidak menerapkan kebijakan panjang minimum pada login agar kebijakan sandi tidak bocor', () => {
    expect(LoginRequestSchema.safeParse({ username: 'budi', password: 'x' }).success).toBe(true);
  });

  it('membatasi panjang kata sandi masukan', () => {
    expect(
      LoginRequestSchema.safeParse({ username: 'budi', password: 'x'.repeat(129) }).success,
    ).toBe(false);
  });
});

describe('kebijakan kata sandi', () => {
  it('mewajibkan minimal 12 karakter untuk kata sandi baru', () => {
    expect(AdminPasswordSchema.safeParse('sebelaschar').success).toBe(false);
    expect(AdminPasswordSchema.safeParse('dua belas ch').success).toBe(true);
  });

  it('menolak nama pengguna dengan karakter di luar daftar', () => {
    expect(AdminUsernameSchema.safeParse('budi santoso').success).toBe(false);
    expect(AdminUsernameSchema.safeParse('bu').success).toBe(false);
  });

  it('menolak perubahan akun kosong', () => {
    expect(AdminUserUpdateSchema.safeParse({}).success).toBe(false);
  });
});
