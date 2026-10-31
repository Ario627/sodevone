import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

const BAGIAN = [
  {
    nomor: '01',
    judul: 'Pengumuman',
    jalur: '/pengumuman',
    ringkas:
      'Informasi akademik, kegiatan, dan administrasi kelas yang sudah diterbitkan pengurus.',
  },
  {
    nomor: '02',
    judul: 'Agenda',
    jalur: '/agenda',
    ringkas: 'Jadwal kegiatan mendatang beserta waktu dan lokasinya.',
  },
  {
    nomor: '03',
    judul: 'Galeri',
    jalur: '/galeri',
    ringkas: 'Dokumentasi kegiatan yang boleh dipublikasikan sesuai kebijakan kelas.',
  },
] as const;

@Component({
  selector: 'kelas-beranda',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './beranda.html',
})
export class Beranda {
  protected readonly bagian = BAGIAN;
}
