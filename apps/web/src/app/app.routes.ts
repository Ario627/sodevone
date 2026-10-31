import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./fitur/beranda/beranda').then((m) => m.Beranda),
    title: 'Beranda — Kelas XI PPLG 1',
  },
  {
    path: '**',
    loadComponent: () => import('./fitur/tidak-ditemukan/tidak-ditemukan').then((m) => m.TidakDitemukan),
    title: 'Halaman tidak ditemukan — Kelas XI PPLG 1',
  },
];
