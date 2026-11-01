import { describe, expect, it } from 'vitest';
import { excerptFromMarkdown } from './excerpt.js';

describe('excerptFromMarkdown', () => {
  it('membuang penanda markdown dan menyisakan teks', () => {
    expect(excerptFromMarkdown('## Judul\n\nIsi **penting** untuk kelas.')).toBe(
      'Judul Isi penting untuk kelas.',
    );
  });

  it('mempertahankan label tautan dan membuang alamatnya', () => {
    expect(excerptFromMarkdown('Lihat [jadwal](https://contoh.test/jadwal) terbaru.')).toBe(
      'Lihat jadwal terbaru.',
    );
  });

  it('membuang kode blok dan kode sebaris', () => {
    expect(excerptFromMarkdown('Pakai `npm test` lalu\n```\nrm -rf /\n```\nselesai.')).toBe(
      'Pakai npm test lalu selesai.',
    );
  });

  it('membuang gambar tanpa menyisakan teks alternatif', () => {
    expect(excerptFromMarkdown('![foto kelas](https://contoh.test/a.jpg) Setelah gambar.')).toBe(
      'Setelah gambar.',
    );
  });

  it('memotong pada batas kata dan menambahkan elipsis', () => {
    const hasil = excerptFromMarkdown('kata '.repeat(80));

    expect(hasil.length).toBeLessThanOrEqual(201);
    expect(hasil.endsWith('…')).toBe(true);
    expect(hasil).not.toMatch(/\s…$/);
  });

  it('tidak menambahkan elipsis bila teks pendek', () => {
    expect(excerptFromMarkdown('Pengumuman singkat.')).toBe('Pengumuman singkat.');
  });

  it('menghasilkan string kosong untuk isi yang hanya penanda', () => {
    expect(excerptFromMarkdown('![gambar](a.png)')).toBe('');
  });
});