import { describe, expect, it } from 'vitest';
import type { ClassMember, MemberAdmin } from '@kelas/contracts';
import { barisBaru, dariAdmin, dariServer, keMasukan } from './admin-anggota.api';

const ADMIN: MemberAdmin = {
  id: 'a1',
  order: 1,
  role: 'student',
  fullName: 'Ayu Lestari',
  nickname: 'Ayu',
  hobby: 'membaca',
  note: 'Selalu bawa buku.',
  isPublished: true,
  updatedAt: '2026-10-20T01:00:00.000Z',
};

const SERVER: ClassMember = {
  id: 'a2',
  order: 2,
  role: 'student',
  fullName: 'Bima Saputra',
  nickname: 'Bima',
  hobby: 'futsal',
  note: 'Kapten tim kelas.',
};

describe('dariAdmin', () => {
  it('menyalin seluruh isian dan memakai id sebagai kunci baris', () => {
    const baris = dariAdmin([ADMIN]);

    expect(baris).toEqual([
      {
        kunci: 'a1',
        role: 'student',
        fullName: 'Ayu Lestari',
        nickname: 'Ayu',
        hobby: 'membaca',
        note: 'Selalu bawa buku.',
        isPublished: true,
      },
    ]);
  });

  it('mempertahankan baris yang belum ditampilkan', () => {
    expect(dariAdmin([{ ...ADMIN, isPublished: false }])[0]?.isPublished).toBe(false);
  });
});

describe('dariServer', () => {
  it('menandai anggota publik sebagai tampil', () => {
    expect(dariServer([SERVER])[0]?.isPublished).toBe(true);
  });
});

describe('keMasukan', () => {
  it('membuang kunci baris sebelum dikirim ke server', () => {
    const masukan = keMasukan(dariAdmin([ADMIN]));

    expect(Object.keys(masukan[0] ?? {})).not.toContain('kunci');
    expect(masukan[0]?.fullName).toBe('Ayu Lestari');
  });

  it('mempertahankan urutan baris apa adanya', () => {
    const masukan = keMasukan([...dariAdmin([ADMIN]), ...dariServer([SERVER])]);

    expect(masukan.map((item) => item.nickname)).toEqual(['Ayu', 'Bima']);
  });
});

describe('barisBaru', () => {
  it('memberi kunci unik untuk dua baris kosong berurutan', () => {
    const pertama = barisBaru(1);
    const kedua = barisBaru(1);

    expect(pertama.kunci).not.toBe(kedua.kunci);
    expect(pertama.role).toBe('student');
    expect(pertama.isPublished).toBe(false);
  });
});
