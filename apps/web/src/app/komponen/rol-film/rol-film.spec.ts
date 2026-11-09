import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import type { AlbumSummary } from '@kelas/contracts';
import { RolFilm } from './rol-film';

function album(slug: string, judul: string, hari: string): AlbumSummary {
  return {
    slug,
    title: judul,
    description: null,
    eventDate: hari,
    state: 'published',
    cover: null,
    imageCount: 4,
    publishedAt: '2026-10-21T01:00:00.000Z',
  };
}

const TIGA: readonly AlbumSummary[] = [
  album('pensi-2026', 'Pensi 2026', '2026-10-20'),
  album('praktik-lab', 'Praktik laboratorium', '2026-10-05'),
  album('bakti-sosial', 'Bakti sosial', '2026-09-12'),
];

async function siapkan(daftar: readonly AlbumSummary[] = TIGA) {
  await TestBed.configureTestingModule({
    imports: [RolFilm],
    providers: [provideRouter([])],
  }).compileComponents();

  const fixture = TestBed.createComponent(RolFilm);

  fixture.componentRef.setInput('album', daftar);
  await fixture.whenStable();

  return fixture;
}

describe('RolFilm', () => {
  it('menulis nomor bingkai pertama sebagai 01 dari 03', async () => {
    const fixture = await siapkan();
    const teks = fixture.nativeElement.textContent as string;

    expect(teks).toContain('01 / 03');
  });

  it('menautkan bingkai aktif ke halaman albumnya', async () => {
    const fixture = await siapkan();
    const tautan = fixture.nativeElement.querySelector('.tautan') as HTMLAnchorElement;

    expect(tautan.getAttribute('href')).toBe('/galeri/pensi-2026');
    expect(tautan.textContent).toContain('Pensi 2026');
  });

  it('menampilkan tanggal dan jumlah foto album aktif', async () => {
    const fixture = await siapkan();
    const teks = fixture.nativeElement.textContent as string;

    expect(teks).toContain('20 OKT 2026');
    expect(teks).toContain('4 foto');
  });

  it('menyusun satu kotak bingkai untuk setiap album', async () => {
    const fixture = await siapkan();

    expect(fixture.nativeElement.querySelectorAll('.jalur .kotak')).toHaveLength(3);
  });

  it('tetap merender jalur kosong saat belum ada album', async () => {
    const fixture = await siapkan([]);

    expect(fixture.nativeElement.querySelectorAll('.jalur .kotak')).toHaveLength(0);
  });
});
