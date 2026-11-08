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
    'Situs ini dikerjakan sendiri dari nol: struktur halaman, sistem gerak, sampai ruang kelas tiga dimensi. Tidak memakai templat.',
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