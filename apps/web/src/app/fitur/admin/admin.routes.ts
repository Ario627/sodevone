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
    ],
  },
];