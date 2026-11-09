import type { Routes } from '@angular/router';
import { authGuard } from '../../inti/sesi/auth.guard';
import { KerangkaAdmin } from './kerangka-admin';

export const adminRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    component: KerangkaAdmin,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'ringkasan' },
      {
        path: 'ringkasan',
        loadComponent: () => import('./ringkasan').then((m) => m.RingkasanAdmin),
        title: 'Ringkasan — Panel pengurus',
      },
      {
        path: 'pengumuman',
        loadComponent: () =>
          import('./pengumuman/daftar-admin').then((m) => m.DaftarAdmin),
        title: 'Pengumuman — Panel pengurus',
      },
      {
        path: 'pengumuman/baru',
        loadComponent: () =>
          import('./pengumuman/editor').then((m) => m.EditorPengumuman),
        title: 'Pengumuman baru — Panel pengurus',
      },
      {
        path: 'pengumuman/:id',
        loadComponent: () =>
          import('./pengumuman/editor').then((m) => m.EditorPengumuman),
        title: 'Ubah pengumuman — Panel pengurus',
      },
      {
        path: 'agenda',
        loadComponent: () => import('./agenda/daftar-admin').then((m) => m.DaftarAdminAgenda),
        title: 'Agenda — Panel pengurus',
      },
      {
        path: 'agenda/baru',
        loadComponent: () => import('./agenda/editor').then((m) => m.EditorAdminAgenda),
        title: 'Kegiatan baru — Panel pengurus',
      },
      {
        path: 'agenda/:id',
        loadComponent: () => import('./agenda/editor').then((m) => m.EditorAdminAgenda),
        title: 'Ubah kegiatan — Panel pengurus',
      },
      {
        path: 'galeri',
        loadComponent: () => import('./galeri/daftar-admin').then((m) => m.DaftarAdminGaleri),
        title: 'Galeri — Panel pengurus',
      },
      {
        path: 'galeri/baru',
        loadComponent: () => import('./galeri/editor').then((m) => m.EditorAdminGaleri),
        title: 'Album baru — Panel pengurus',
      },
      {
        path: 'galeri/:id',
        loadComponent: () => import('./galeri/editor').then((m) => m.EditorAdminGaleri),
        title: 'Ubah album — Panel pengurus',
      },
      {
        path: 'anggota',
        loadComponent: () => import('./anggota/editor').then((m) => m.EditorAdminAnggota),
        title: 'Anggota kelas — Panel pengurus',
      },
      {
        path: 'papan',
        loadComponent: () => import('./papan/editor').then((m) => m.EditorAdminPapan),
        title: 'Papan piksel — Panel pengurus',
      },
    ],
  },
];