import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import type { AnnouncementSummary } from '@kelas/contracts';
import { PapanLayang } from './papan-layang';

const DUA: readonly AnnouncementSummary[] = [
  {
    slug: 'rapat-wali-murid',
    title: 'Rapat wali murid semester ganjil',
    excerpt: 'Rapat digelar di aula sekolah selepas jam pelajaran.',
    category: 'kegiatan',
    state: 'published',
    isPinned: false,
    publishedAt: '2026-10-28T02:00:00.000Z',
  },
  {
    slug: 'jadwal-ujian-praktik',
    title: 'Jadwal ujian praktik kejuruan',
    excerpt: 'Ujian dibagi menjadi tiga sesi harian.',
    category: 'akademik',
    state: 'published',
    isPinned: false,
    publishedAt: '2026-10-27T02:00:00.000Z',
  },
];

async function siapkan(butir: readonly AnnouncementSummary[] = DUA) {
  await TestBed.configureTestingModule({ imports: [PapanLayang] }).compileComponents();

  const fixture = TestBed.createComponent(PapanLayang);

  fixture.componentRef.setInput('butir', butir);
  await fixture.whenStable();

  return fixture;
}

describe('PapanLayang', () => {
  it('menyediakan satu tombol papan untuk setiap pengumuman', async () => {
    const fixture = await siapkan();
    const tombol = fixture.nativeElement.querySelectorAll('.tombol button');

    expect(tombol).toHaveLength(2);
    expect(tombol[0]?.textContent).toContain('Rapat wali murid semester ganjil');
    expect(tombol[1]?.textContent).toContain('Jadwal ujian praktik kejuruan');
  });

  it('memancarkan slug pengumuman saat tombol papan ditekan', async () => {
    const fixture = await siapkan();
    const dikirim = vi.fn();

    fixture.componentInstance.buka.subscribe(dikirim);

    const tombol = fixture.nativeElement.querySelectorAll('.tombol button') as NodeListOf<HTMLButtonElement>;

    tombol[1]?.click();

    expect(dikirim).toHaveBeenCalledWith('jadwal-ujian-praktik');
  });

  it('tidak menampilkan tombol saat belum ada pengumuman', async () => {
    const fixture = await siapkan([]);

    expect(fixture.nativeElement.querySelectorAll('.tombol button')).toHaveLength(0);
  });

  it('menyebut jumlah pengumuman pada label kanvas', async () => {
    const fixture = await siapkan();
    const kanvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;

    expect(kanvas.getAttribute('aria-label')).toContain('2 pengumuman');
  });
});
