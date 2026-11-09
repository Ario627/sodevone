import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import type { AlbumSummary } from '@kelas/contracts';
import { PuzzleFoto } from './puzzle-foto';

function album(slug: string, lebar: number, tinggi: number, jumlah = 4): AlbumSummary {
  return {
    slug,
    title: slug,
    description: null,
    eventDate: '2026-10-20',
    state: 'published',
    cover: { id: `id-${slug}`, width: lebar, height: tinggi, altText: null, sortOrder: 0 },
    imageCount: jumlah,
    publishedAt: '2026-10-21T01:00:00.000Z',
  };
}

const DAFTAR: readonly AlbumSummary[] = [
  album('hero', 1200, 800),
  album('lebar', 1600, 900),
  album('tinggi', 800, 1400),
  album('kotak', 1000, 1000),
];

async function siapkan(daftar: readonly AlbumSummary[] = DAFTAR) {
  await TestBed.configureTestingModule({
    imports: [PuzzleFoto],
    providers: [provideRouter([])],
  }).compileComponents();

  const fixture = TestBed.createComponent(PuzzleFoto);

  fixture.componentRef.setInput('album', daftar);
  await fixture.whenStable();

  return fixture;
}

describe('PuzzleFoto', () => {
  it('menyusun satu ubin untuk setiap album', async () => {
    const fixture = await siapkan();

    expect(fixture.nativeElement.querySelectorAll('.ubin')).toHaveLength(4);
  });

  it('memberi bentuk hero pada ubin pertama', async () => {
    const fixture = await siapkan();
    const ubin = fixture.nativeElement.querySelectorAll('.ubin');

    expect(ubin[0]?.classList.contains('ubin-hero')).toBe(true);
  });

  it('melebarkan ubin yang sampulnya lanskap saat kolom mencukupi', async () => {
    const fixture = await siapkan([...DAFTAR, album('lebar-2', 1700, 950)]);
    const ubin = fixture.nativeElement.querySelectorAll('.ubin');

    expect(ubin[1]?.classList.contains('ubin-lebar')).toBe(true);
    expect(ubin[2]?.classList.contains('ubin-tinggi')).toBe(true);
  });

  it('tidak melebarkan ubin saat kolom hanya tiga', async () => {
    const fixture = await siapkan(DAFTAR.slice(0, 3));
    const ubin = fixture.nativeElement.querySelectorAll('.ubin');

    expect(ubin[1]?.classList.contains('ubin-lebar')).toBe(false);
  });

  it('menautkan setiap ubin ke halaman albumnya', async () => {
    const fixture = await siapkan();
    const tautan = fixture.nativeElement.querySelectorAll('.ubin a');

    expect(tautan[2]?.getAttribute('href')).toBe('/galeri/tinggi');
  });

  it('memakai teks alternatif dari sampul bila ada', async () => {
    const fixture = await siapkan([{ ...album('polos', 900, 900) }]);
    const gambar = fixture.nativeElement.querySelector('.ubin img') as HTMLImageElement;

    expect(gambar.getAttribute('alt')).toBe('polos');
  });

  it('menampilkan kotak bernomor saat album belum punya sampul', async () => {
    const fixture = await siapkan([{ ...album('kosong', 900, 900), cover: null }]);
    const teks = fixture.nativeElement.textContent as string;

    expect(teks).toContain('01');
    expect(fixture.nativeElement.querySelector('.ubin img')).toBeNull();
  });
});
