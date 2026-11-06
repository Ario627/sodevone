import { describe, expect, it } from 'vitest';
import { excerptFromMarkdown } from './excerpt.js';

describe('excerptFromMarkdown', () => {
  it('memakai paragraf pertama sebagai ringkasan dan membuang judul bagian', () => {
    expect(excerptFromMarkdown('## Judul\n\nIsi **penting** untuk kelas.')).toBe(
      'Isi penting untuk kelas.',
    );
  });

  it('memisahkan paragraf dengan tanda baca, bukan menempelkan jadi satu kalimat', () => {
    expect(excerptFromMarkdown('Kalimat pertama.\n\nKalimat kedua.')).toBe(
      'Kalimat pertama. Kalimat kedua.',
    );
  });

  it('menambahkan pemisah kalimat saat blok tidak diakhiri tanda baca', () => {
    expect(excerptFromMarkdown('Isi tanpa titik\n\nLanjutan tanpa titik')).toBe(
      'Isi tanpa titik. Lanjutan tanpa titik',
    );
  });

  it('memakai butir daftar hanya bila tidak ada prosa', () => {
    expect(excerptFromMarkdown('## Yang perlu dibawa\n\n- Kartu peserta\n- Perangkat sendiri')).toBe(
      'Kartu peserta, Perangkat sendiri',
    );
  });

  it('memakai judul sebagai upaya terakhir', () => {
    expect(excerptFromMarkdown('## Hanya judul tanpa isi')).toBe('Hanya judul tanpa isi');
  });

  it('menggabungkan prosa pendek dengan butir daftar', () => {
    expect(excerptFromMarkdown('Singkat.\n\n- Satu\n- Dua')).toBe('Singkat. Satu, Dua');
  });

  it('mempertahankan label tautan dan membuang alamatnya', () => {
    expect(excerptFromMarkdown('Lihat [jadwal](https://contoh.test/jadwal) terbaru.')).toBe(
      'Lihat jadwal terbaru.',
    );
  });

  it('membuang kode blok dan mempertahankan kode sebaris', () => {
    expect(excerptFromMarkdown('Pakai `npm test` lalu\n```\nrm -rf /\n```\nselesai.')).toBe(
      'Pakai npm test lalu selesai.',
    );
  });

  it('membuang gambar tanpa menyisakan teks alternatif', () => {
    expect(excerptFromMarkdown('![foto kelas](https://contoh.test/a.jpg) Setelah gambar.')).toBe(
      'Setelah gambar.',
    );
  });

  it('membuang garis pemisah dan tanda kutip', () => {
    expect(excerptFromMarkdown('---\n\n> Kutipan kelas.')).toBe('Kutipan kelas.');
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
    expect(excerptFromMarkdown('---')).toBe('');
  });

  it('menghasilkan ringkasan yang terbaca untuk isi berpola pengumuman nyata', () => {
    const isi = [
      'Ujian praktik dimulai **07.30**, bukan 08.00.',
      '',
      '## Yang perlu dibawa',
      '',
      '- Kartu peserta',
      '- Perangkat sendiri',
      '',
      'Hubungi pengurus bila ada kendala.',
    ].join('\n');

    expect(excerptFromMarkdown(isi)).toBe(
      'Ujian praktik dimulai 07.30, bukan 08.00. Hubungi pengurus bila ada kendala.',
    );
  });
});
