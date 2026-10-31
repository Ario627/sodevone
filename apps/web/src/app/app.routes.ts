import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./fitur/beranda/beranda').then((m) => m.Beranda),
    title: 'Beranda — Kelas XI PPLG 1',
  },
  {
    path: 'pengumuman',
    loadComponent: () =>
      import('./fitur/pengumuman/daftar-pengumuman').then((m) => m.DaftarPengumuman),
    title: 'Pengumuman — Kelas XI PPLG 1',
  },
  {
    path: 'pengumuman/:slug',
    loadComponent: () =>
      import('./fitur/pengumuman/detail-pengumuman').then((m) => m.DetailPengumuman),
    title: 'Pengumuman — Kelas XI PPLG 1',
  },
  {
    path: 'agenda',
    loadComponent: () => import('./fitur/agenda/daftar-agenda').then((m) => m.DaftarAgenda),
    title: 'Agenda — Kelas XI PPLG 1',
  },
  {
    path: 'agenda/:slug',
    loadComponent: () => import('./fitur/agenda/detail-agenda').then((m) => m.DetailAgenda),
    title: 'Agenda — Kelas XI PPLG 1',
  },
  {
    path: 'tentang',
    loadComponent: () => import('./fitur/tentang/tentang').then((m) => m.Tentang),
    title: 'Tentang — Kelas XI PPLG 1',
  },
  {
    path: '**',
    loadComponent: () => import('./fitur/tidak-ditemukan/tidak-ditemukan').then((m) => m.TidakDitemukan),
    title: 'Halaman tidak ditemukan — Kelas XI PPLG 1',
  },
];
