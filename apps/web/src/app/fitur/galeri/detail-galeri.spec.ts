import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { DetailGaleri } from './detail-galeri';

const FOTO = {
  id: '44444444-4444-4444-8444-444444444444',
  width: 1024,
  height: 768,
  altText: 'Panggung pensi',
  sortOrder: 0,
};

function albumDengan(overrides: Record<string, unknown> = {}) {
  return {
    slug: 'pensi-2026',
    title: 'Pensi 2026',
    description: null,
    eventDate: '2026-10-20',
    state: 'published',
    cover: FOTO,
    imageCount: 1,
    publishedAt: '2026-10-21T01:00:00.000Z',
    images: {
      items: [FOTO],
      meta: { page: 1, perPage: 24, total: 1, totalPages: 1 },
    },
    ...overrides,
  };
}

async function siapkan(slug = 'pensi-2026', page?: string) {
  await TestBed.configureTestingModule({
    imports: [DetailGaleri],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();

  const fixture = TestBed.createComponent(DetailGaleri);
  fixture.componentRef.setInput('slug', slug);
  fixture.componentRef.setInput('page', page);
  TestBed.tick();

  return { fixture, http: TestBed.inject(HttpTestingController) };
}

describe('DetailGaleri', () => {
  it('meminta satu halaman foto dengan batas 24 per halaman', async () => {
    const { http } = await siapkan();

    const permintaan = http.expectOne((req) => req.url === '/api/public/albums/pensi-2026');

    expect(permintaan.request.params.get('page')).toBe('1');
    expect(permintaan.request.params.get('perPage')).toBe('24');

    permintaan.flush(albumDengan());
    http.verify();
  });

  it('meneruskan nomor halaman foto ke server', async () => {
    const { http } = await siapkan('pensi-2026', '3');

    const permintaan = http.expectOne((req) => req.url === '/api/public/albums/pensi-2026');

    expect(permintaan.request.params.get('page')).toBe('3');

    permintaan.flush(albumDengan());
  });

  it('menampilkan keadaan kosong saat album belum berisi foto', async () => {
    const { fixture, http } = await siapkan();

    http
      .expectOne((req) => req.url === '/api/public/albums/pensi-2026')
      .flush(
        albumDengan({
          cover: null,
          imageCount: 0,
          images: { items: [], meta: { page: 1, perPage: 24, total: 0, totalPages: 0 } },
        }),
      );

    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('belum berisi foto');
  });

  it('menampilkan halaman 404 saat album tidak ditemukan', async () => {
    const { fixture, http } = await siapkan();

    http
      .expectOne((req) => req.url === '/api/public/albums/pensi-2026')
      .flush(
        { error: { code: 'NOT_FOUND', message: 'Album tidak ditemukan.' } },
        { status: 404, statusText: 'Not Found' },
      );

    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Album tidak ditemukan');
  });

  it('tidak memanggil server saat slug tidak sah', async () => {
    const { http } = await siapkan('Bukan_Slug');

    http.expectNone((req) => req.url.startsWith('/api/public/albums/'));
  });

  it('memakai teks alternatif foto dan nomor urut yang melanjutkan halaman sebelumnya', async () => {
    const { fixture, http } = await siapkan('pensi-2026', '2');

    http
      .expectOne((req) => req.url === '/api/public/albums/pensi-2026')
      .flush(
        albumDengan({
          imageCount: 25,
          images: {
            items: [{ ...FOTO, altText: null }],
            meta: { page: 2, perPage: 24, total: 25, totalPages: 2 },
          },
        }),
      );

    await fixture.whenStable();

    const gambar = fixture.nativeElement.querySelector('img') as HTMLImageElement;

    expect(gambar.getAttribute('alt')).toBe('Foto 25 album ini');
    expect(gambar.getAttribute('src')).toContain('ukuran=kecil');
    expect(gambar.getAttribute('srcset')).toContain('1024w');
  });

  it('memuat satu baris kisi secara eager dan sisanya lazy', async () => {
    const { fixture, http } = await siapkan();

    const items = Array.from({ length: 6 }, (_, indeks) => ({
      ...FOTO,
      id: `55555555-5555-4555-8555-5555555555${String(indeks).padStart(2, '0')}`,
      sortOrder: indeks,
    }));

    http
      .expectOne((req) => req.url === '/api/public/albums/pensi-2026')
      .flush(
        albumDengan({
          imageCount: 6,
          images: {
            items,
            meta: { page: 1, perPage: 24, total: 6, totalPages: 1 },
          },
        }),
      );

    await fixture.whenStable();

    const gambar = Array.from(
      fixture.nativeElement.querySelectorAll('img'),
    ) as HTMLImageElement[];

    expect(gambar).toHaveLength(6);
    expect(gambar.slice(0, 4).map((item) => item.getAttribute('loading'))).toEqual([
      'eager',
      'eager',
      'eager',
      'eager',
    ]);
    expect(gambar.slice(4).map((item) => item.getAttribute('loading'))).toEqual(['lazy', 'lazy']);
    expect(gambar[0]?.getAttribute('fetchpriority')).toBe('high');
    expect(gambar[1]?.getAttribute('fetchpriority')).toBeNull();
  });

  it('membuka penampil foto saat gambar dipilih', async () => {
    const { fixture, http } = await siapkan();

    http.expectOne((req) => req.url === '/api/public/albums/pensi-2026').flush(albumDengan());

    await fixture.whenStable();

    const tombol = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    tombol.click();
    await fixture.whenStable();

    const dialog = document.querySelector('[role="dialog"]');

    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-label')).toContain('gambar 1 dari 1');
  });
});
