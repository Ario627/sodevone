import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./fitur/beranda/beranda').then((m) => m.Beranda),
    title: 'Beranda — XI PPLG 1',
  },
  {
    path: 'pengumuman',
    loadComponent: () =>
      import('./fitur/pengumuman/daftar-pengumuman').then((m) => m.DaftarPengumuman),
    title: 'Pengumuman — XI PPLG 1',
  },
  {
    path: 'pengumuman/:slug',
    loadComponent: () =>
      import('./fitur/pengumuman/detail-pengumuman').then((m) => m.DetailPengumuman),
    title: 'Pengumuman — XI PPLG 1',
  },
  {
    path: 'agenda',
    loadComponent: () => import('./fitur/agenda/daftar-agenda').then((m) => m.DaftarAgenda),
    title: 'Agenda — XI PPLG 1',
  },
  {
    path: 'agenda/:slug',
    loadComponent: () => import('./fitur/agenda/detail-agenda').then((m) => m.DetailAgenda),
    title: 'Agenda — XI PPLG 1',
  },
  {
    path: 'galeri',
    loadComponent: () => import('./fitur/galeri/daftar-galeri').then((m) => m.DaftarGaleri),
    title: 'Galeri — XI PPLG 1',
  },
  {
    path: 'galeri/:slug',
    loadComponent: () => import('./fitur/galeri/detail-galeri').then((m) => m.DetailGaleri),
    title: 'Galeri — XI PPLG 1',
  },
  {
    path: 'kelas',
    loadComponent: () => import('./fitur/kelas/kelas').then((m) => m.Kelas),
    title: 'Kelas — XI PPLG 1',
  },
  {
    path: 'masuk',
    loadComponent: () => import('./fitur/masuk/masuk').then((m) => m.Masuk),
    title: 'Masuk — XI PPLG 1',
  },
  {
    path: 'admin',
    loadChildren: () => import('./fitur/admin/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: 'tentang',
    loadComponent: () => import('./fitur/tentang/tentang').then((m) => m.Tentang),
    title: 'Tentang — XI PPLG 1',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./fitur/tidak-ditemukan/tidak-ditemukan').then((m) => m.TidakDitemukan),
    title: 'Halaman tidak ditemukan — XI PPLG 1',
  },
];
