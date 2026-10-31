import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { DaftarPengumuman } from './daftar-pengumuman';

const KOSONG = { items: [], meta: { page: 1, perPage: 10, total: 0, totalPages: 0 } };

async function siapkan() {
  await TestBed.configureTestingModule({
    imports: [DaftarPengumuman],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();

  const fixture = TestBed.createComponent(DaftarPengumuman);
  TestBed.tick();

  return { fixture, http: TestBed.inject(HttpTestingController) };
}

describe('DaftarPengumuman', () => {
  it('meminta halaman pertama dengan jumlah per halaman tetap', async () => {
    const { http } = await siapkan();

    const permintaan = http.expectOne((req) => req.url === '/api/public/announcements');

    expect(permintaan.request.params.get('page')).toBe('1');
    expect(permintaan.request.params.get('perPage')).toBe('10');
    expect(permintaan.request.params.has('kategori')).toBe(false);

    permintaan.flush(KOSONG);
    http.verify();
  });

  it('menampilkan keadaan kosong saat tidak ada pengumuman terbit', async () => {
    const { fixture, http } = await siapkan();

    http.expectOne((req) => req.url === '/api/public/announcements').flush(KOSONG);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Tidak ada pengumuman');
  });
});
