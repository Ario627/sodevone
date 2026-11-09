import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import type { EventSummary } from '@kelas/contracts';
import { LinimasaSemester } from './linimasa-semester';

const KEGIATAN: readonly EventSummary[] = [
  {
    slug: 'studi-tour',
    title: 'Studi tour industri',
    startsAt: '2026-09-14T01:00:00.000Z',
    endsAt: null,
    location: 'Kawasan industri',
    state: 'published',
  },
  {
    slug: 'lomba-gim',
    title: 'Lomba gim antar kelas',
    startsAt: '2026-11-02T02:00:00.000Z',
    endsAt: null,
    location: 'Lab komputer',
    state: 'published',
  },
  {
    slug: 'pensi',
    title: 'Pensi sekolah',
    startsAt: '2026-12-19T03:00:00.000Z',
    endsAt: null,
    location: 'Lapangan',
    state: 'published',
  },
];

async function siapkan(kegiatan: readonly EventSummary[] = KEGIATAN) {
  await TestBed.configureTestingModule({
    imports: [LinimasaSemester],
    providers: [provideRouter([])],
  }).compileComponents();

  const fixture = TestBed.createComponent(LinimasaSemester);

  fixture.componentRef.setInput('kegiatan', kegiatan);
  await fixture.whenStable();

  return fixture;
}

describe('LinimasaSemester', () => {
  it('menampilkan jumlah tahap sesuai jumlah kegiatan', async () => {
    const fixture = await siapkan();
    const teks = fixture.nativeElement.textContent as string;

    expect(teks).toContain('Tahap 1 dari 3');
  });

  it('menautkan kegiatan pertama ke halaman agendanya', async () => {
    const fixture = await siapkan();
    const tautan = fixture.nativeElement.querySelector('.judul') as HTMLAnchorElement;

    expect(tautan.getAttribute('href')).toBe('/agenda/studi-tour');
    expect(tautan.textContent).toContain('Studi tour industri');
  });

  it('menggambar satu titik penanda untuk setiap kegiatan', async () => {
    const fixture = await siapkan();
    const titik = fixture.nativeElement.querySelectorAll('.titik .butir');

    expect(titik).toHaveLength(3);
  });

  it('menandai tahap pertama sebagai tahap yang sedang berjalan', async () => {
    const fixture = await siapkan();
    const titik = fixture.nativeElement.querySelectorAll('.titik .butir');

    expect(titik[0]?.classList.contains('kini')).toBe(true);
    expect(titik[1]?.classList.contains('kini')).toBe(false);
    expect(titik[1]?.classList.contains('lewats')).toBe(false);
  });

  it('memberi label tanpa kegiatan saat daftar kosong', async () => {
    const fixture = await siapkan([]);
    const teks = fixture.nativeElement.textContent as string;

    expect(teks).toContain('Tanpa kegiatan');
  });
});
