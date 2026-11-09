import { describe, expect, it } from 'vitest';
import type { ClassMember, Contributor, SocialLink } from '@kelas/contracts';
import { JUMLAH_SISWA, dariServer } from '../kelas/anggota';
import { pembuatDariServer } from '../pembuat';
import { sumberGambarSosial } from './sosial.api';

function siswa(order: number, nama: string): ClassMember {
  return {
    id: `anggota-${order}`,
    order,
    role: 'student',
    fullName: nama,
    nickname: nama.split(' ')[0] as string,
    hobby: 'membaca',
    note: 'Catatan singkat.',
  };
}

function wali(order: number): ClassMember {
  return {
    id: 'wali-1',
    order,
    role: 'homeroom',
    fullName: 'Ratna Kusumaningrum',
    nickname: 'Bu Ratna',
    hobby: 'menyusun jadwal',
    note: 'Selalu ingat siapa yang belum mengumpulkan.',
  };
}

function sosial(gambar: SocialLink['image']): SocialLink {
  return {
    id: 'tautan-1',
    platform: 'instagram',
    url: 'https://www.instagram.com/p/contoh/',
    caption: null,
    postedAt: null,
    image: gambar,
  };
}

describe('dariServer', () => {
  it('mengurutkan anggota mengikuti kolom order, bukan urutan kiriman', () => {
    const hasil = dariServer([siswa(3, 'Citra Dewi'), siswa(1, 'Ayu Lestari'), siswa(2, 'Bima Saputra')]);

    expect(hasil.map((item) => item.nama)).toEqual(['Ayu Lestari', 'Bima Saputra', 'Citra Dewi']);
    expect(hasil.map((item) => item.urut)).toEqual([1, 2, 3]);
  });

  it('menempatkan wali kelas di urutan terakhir berapa pun posisinya di kiriman', () => {
    const hasil = dariServer([wali(9), siswa(1, 'Ayu Lestari'), siswa(2, 'Bima Saputra')]);

    expect(hasil).toHaveLength(3);
    expect(hasil[2]?.id).toBe('wali-1');
    expect(hasil[2]?.urut).toBe(3);
  });

  it('memotong siswa menjadi sebanyak kursi yang tersedia', () => {
    const banyak = Array.from({ length: JUMLAH_SISWA + 5 }, (_, indeks) =>
      siswa(indeks + 1, `Siswa ${indeks + 1}`),
    );

    const hasil = dariServer(banyak);

    expect(hasil).toHaveLength(JUMLAH_SISWA);
    expect(hasil.filter((item) => item.id === 'wali-1')).toHaveLength(0);
  });

  it('membiarkan daftar kosong saat server belum mengirim anggota', () => {
    expect(dariServer([])).toEqual([]);
  });

  it('memberi warna corak yang berbeda untuk anggota berurutan', () => {
    const hasil = dariServer([siswa(1, 'Ayu Lestari'), siswa(2, 'Bima Saputra')]);

    expect(hasil[0]?.warna).not.toBe(hasil[1]?.warna);
  });
});

describe('pembuatDariServer', () => {
  it('memetakan seluruh kolom kartu pembuat', () => {
    const nilai: Contributor = {
      id: 'a2f0f0ee-0000-4000-8000-000000000000',
      name: 'Ario Abdillah Sajad',
      nickname: 'Ario',
      role: 'Perancang & pengembang situs',
      className: 'XI PPLG 1',
      summary: 'Situs ini dikerjakan sendiri dari nol tanpa templat.',
      focuses: [{ title: 'Antarmuka', body: 'Tata letak, kisi, dan tipografi.' }],
      tools: ['Angular', 'Three.js'],
    };

    expect(pembuatDariServer(nilai)).toEqual({
      nama: 'Ario Abdillah Sajad',
      panggilan: 'Ario',
      peran: 'Perancang & pengembang situs',
      kelas: 'XI PPLG 1',
      ringkas: 'Situs ini dikerjakan sendiri dari nol tanpa templat.',
      fokus: [{ judul: 'Antarmuka', isi: 'Tata letak, kisi, dan tipografi.' }],
      alat: ['Angular', 'Three.js'],
    });
  });
});

describe('sumberGambarSosial', () => {
  it('memakai berkas media lokal saat gambar tersimpan di server', () => {
    const alamat = sumberGambarSosial(
      sosial({
        id: '7d0f0f0e-1111-4222-8333-444455556666',
        url: null,
        width: 1080,
        height: 1350,
        altText: 'Praktik laboratorium',
      }),
      'kecil',
    );

    expect(alamat).toBe('/api/media/7d0f0f0e-1111-4222-8333-444455556666?ukuran=kecil');
  });

  it('memakai tautan luar saat gambar hanya tersedia di CDN media sosial', () => {
    const alamat = sumberGambarSosial(
      sosial({
        id: null,
        url: 'https://cdn.contoh/a.jpg',
        width: 1080,
        height: 1350,
        altText: null,
      }),
      'sedang',
    );

    expect(alamat).toBe('https://cdn.contoh/a.jpg');
  });
});
