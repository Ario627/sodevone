import type { PembuatServer } from './api/pembuat.api';

export interface Pembuat {
  readonly nama: string;
  readonly panggilan: string;
  readonly peran: string;
  readonly kelas: string;
  readonly ringkas: string;
  readonly fokus: readonly { readonly judul: string; readonly isi: string }[];
  readonly alat: readonly string[];
}

export const PEMBUAT: Pembuat = {
  nama: 'Ario Abdillah Sajad',
  panggilan: 'Ario',
  peran: 'Perancang & pengembang situs',
  kelas: 'XI PPLG 1',
  ringkas:
    'Situs ini dikerjakan sendiri dari nol: struktur halaman, sistem gerak, sampai ruang kelas tiga dimensi.',
  fokus: [
    {
      judul: 'Antarmuka',
      isi: 'Tata letak, kisi, tipografi, dan warna yang dipakai seluruh halaman.',
    },
    {
      judul: 'Gerak',
      isi: 'Garis jejak, kamera ruang kelas, dan transisi yang mengikuti gulir.',
    },
    {
      judul: 'Tiga dimensi',
      isi: 'Diorama kelas dan monogram voxel yang dibangun dari kisi piksel.',
    },
  ],
  alat: ['Angular', 'TypeScript', 'Tailwind', 'Three.js', 'GSAP', 'NestJS', 'PostgreSQL'],
};

export function pembuatDariServer(nilai: PembuatServer): Pembuat {
  return {
    nama: nilai.name,
    panggilan: nilai.nickname,
    peran: nilai.role,
    kelas: nilai.className,
    ringkas: nilai.summary,
    fokus: nilai.focuses.map((item) => ({ judul: item.title, isi: item.body })),
    alat: nilai.tools,
  };
}
