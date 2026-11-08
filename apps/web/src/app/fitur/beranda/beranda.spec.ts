import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { Beranda } from './beranda';

const KOSONG = { announcements: [], upcomingEvents: [], albums: [] };

function kosongkanSosial(http: HttpTestingController): void {
  for (const permintaan of http.match((r) => r.url === '/api/public/social')) {
    permintaan.flush({ items: [] });
  }
}

async function siapkan() {
  await TestBed.configureTestingModule({
    imports: [Beranda],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();

  const fixture = TestBed.createComponent(Beranda);
  TestBed.tick();

  return { fixture, http: TestBed.inject(HttpTestingController) };
}

const PENGUMUMAN = {
  slug: 'perubahan-jadwal',
  title: 'Perubahan jadwal ujian',
  excerpt: 'Ujian dimulai pukul 07.30.',
  category: 'akademik',
  state: 'published',
  publishedAt: '2026-10-29T01:00:00.000Z',
};

const KEGIATAN = {
  slug: 'kerja-kelompok',
  title: 'Kerja kelompok',
  startsAt: '2027-01-10T02:00:00.000Z',
  endsAt: null,
  location: 'Ruang 12',
  state: 'published',
};

const ALBUM = {
  slug: 'pensi-2026',
  title: 'Pensi 2026',
  description: null,
  eventDate: '2026-10-20',
  state: 'published',
  cover: null,
  imageCount: 3,
  publishedAt: '2026-10-21T01:00:00.000Z',
};

describe('Beranda', () => {
  it('memakai satu permintaan agregat untuk konten utama', async () => {
    const { http } = await siapkan();

    const permintaan = http.expectOne('/api/public/home');

    expect(permintaan.request.method).toBe('GET');

    permintaan.flush(KOSONG);
    kosongkanSosial(http);
    http.verify();
  });

  it('menyembunyikan blok media sosial saat endpoint belum tersedia', async () => {
    const { fixture, http } = await siapkan();

    http.expectOne('/api/public/home').flush(KOSONG);

    for (const permintaan of http.match((r) => r.url === '/api/public/social')) {
      permintaan.flush(
        { error: { code: 'NOT_FOUND', message: 'Belum ada.' } },
        { status: 404, statusText: 'Not Found' },
      );
    }

    await fixture.whenStable();

    const teks = fixture.nativeElement.textContent as string;

    expect(teks).not.toContain('Dari media sosial');
  });

  it('merender mosaik media sosial ketika endpoint mengirim data', async () => {
    const { fixture, http } = await siapkan();

    http.expectOne('/api/public/home').flush(KOSONG);

    for (const permintaan of http.match((r) => r.url === '/api/public/social')) {
      permintaan.flush({
        items: [
          {
            id: 'sosial-1',
            platform: 'instagram',
            url: 'https://instagram.com/p/contoh',
            caption: 'Praktik laboratorium',
            postedAt: '2026-10-29T02:00:00.000Z',
            image: { id: null, url: 'https://cdn.contoh/a.jpg', width: 1080, height: 1350 },
          },
        ],
      });
    }

    await fixture.whenStable();

    const teks = fixture.nativeElement.textContent as string;

    expect(teks).toContain('Dari media sosial');
    expect(teks).toContain('Instagram');
  });

  it('menampilkan pesan untuk blok yang kosong tanpa menyembunyikannya', async () => {
    const { fixture, http } = await siapkan();

    http.expectOne('/api/public/home').flush(KOSONG);
    kosongkanSosial(http);
    await fixture.whenStable();

    const teks = fixture.nativeElement.textContent as string;

    expect(teks).toContain('Belum ada pengumuman terbit');
    expect(teks).toContain('Belum ada kegiatan yang dijadwalkan');
  });

  it('tidak menampilkan blok galeri saat tidak ada album', async () => {
    const { fixture, http } = await siapkan();

    http.expectOne('/api/public/home').flush(KOSONG);
    kosongkanSosial(http);
    await fixture.whenStable();

    const teks = fixture.nativeElement.textContent as string;

    expect(teks).not.toContain('Sorotan galeri');
  });

  it('merender pengumuman, agenda, dan album dari satu respons', async () => {
    const { fixture, http } = await siapkan();

    http
      .expectOne('/api/public/home')
      .flush({ announcements: [PENGUMUMAN], upcomingEvents: [KEGIATAN], albums: [ALBUM] });

    kosongkanSosial(http);
    await fixture.whenStable();

    const teks = fixture.nativeElement.textContent as string;

    expect(teks).toContain('Perubahan jadwal ujian');
    expect(teks).toContain('Kerja kelompok');
    expect(teks).toContain('Ruang 12');
    expect(teks).toContain('Pensi 2026');
    expect(teks).toContain('3 foto');
  });

  it('menautkan setiap item ke halaman detailnya', async () => {
    const { fixture, http } = await siapkan();

    http
      .expectOne('/api/public/home')
      .flush({ announcements: [PENGUMUMAN], upcomingEvents: [KEGIATAN], albums: [ALBUM] });

    kosongkanSosial(http);
    await fixture.whenStable();

    const jalur = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
    ).map((tautan) => tautan.getAttribute('href'));

    expect(jalur).toContain('/pengumuman/perubahan-jadwal');
    expect(jalur).toContain('/agenda/kerja-kelompok');
    expect(jalur).toContain('/galeri/pensi-2026');
  });

  it('menampilkan keadaan galat dengan tombol coba lagi', async () => {
    const { fixture, http } = await siapkan();

    http
      .expectOne('/api/public/home')
      .flush(
        { error: { code: 'SERVICE_UNAVAILABLE', message: 'Situs sedang diperbarui.' } },
        { status: 503, statusText: 'Service Unavailable' },
      );

    kosongkanSosial(http);
    await fixture.whenStable();

    const teks = fixture.nativeElement.textContent as string;

    expect(teks).toContain('Konten gagal dimuat');
    expect(teks).toContain('Coba lagi');
  });

  it('tidak pernah menampilkan agenda lampau karena server hanya mengirim yang mendatang', async () => {
    const { fixture, http } = await siapkan();

    http.expectOne('/api/public/home').flush({
      announcements: [],
      upcomingEvents: [],
      albums: [],
    });

    kosongkanSosial(http);
    await fixture.whenStable();

    expect((fixture.nativeElement.textContent as string).includes('Lampau')).toBe(false);
  });
});
