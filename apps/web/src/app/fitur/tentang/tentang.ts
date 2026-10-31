import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

const JALUR = [
  {
    nomor: '01',
    judul: 'Pengumuman',
    jalur: '/pengumuman',
    ringkas: 'Informasi akademik, kegiatan, dan administrasi kelas.',
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
    ringkas: 'Dokumentasi kegiatan yang boleh dipublikasikan.',
  },
] as const;

@Component({
  selector: 'kelas-tentang',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="max-w-[46rem]">
      <p class="teks-meta text-sinyal">Informasi kelas</p>
      <h1 class="mt-4 font-serif text-[clamp(2rem,5vw,3rem)] leading-[1] tracking-[-0.025em]">
        Tentang kelas ini
      </h1>
      <p class="mt-5 text-md text-teks-kuat-sekunder">
        Kelas XI PPLG 1 adalah rombongan belajar jurusan Pengembangan Perangkat Lunak dan Gim.
        Situs ini menjadi kanal resmi kelas untuk pengumuman, jadwal kegiatan, dan dokumentasi.
      </p>
    </header>

    <section aria-labelledby="identitas-judul" class="mt-12 grid gap-8 lg:grid-cols-12">
      <div class="lg:col-span-4">
        <h2 id="identitas-judul" class="teks-meta text-teks-sekunder">Identitas</h2>
      </div>
      <dl class="lg:col-span-8">
        <div
          class="grid grid-cols-[1fr_auto] items-baseline gap-4 border-t border-garis-halus py-3"
        >
          <dt class="text-sm text-teks-sekunder">Nama kelas</dt>
          <dd class="text-sm">XI PPLG 1</dd>
        </div>
        <div
          class="grid grid-cols-[1fr_auto] items-baseline gap-4 border-t border-garis-halus py-3"
        >
          <dt class="text-sm text-teks-sekunder">Tingkat</dt>
          <dd class="teks-meta">XI</dd>
        </div>
        <div
          class="grid grid-cols-[1fr_auto] items-baseline gap-4 border-t border-garis-halus py-3"
        >
          <dt class="text-sm text-teks-sekunder">Jurusan</dt>
          <dd class="teks-meta">PPLG</dd>
        </div>
        <div
          class="grid grid-cols-[1fr_auto] items-baseline gap-4 border-y border-garis-halus py-3"
        >
          <dt class="text-sm text-teks-sekunder">Rombel</dt>
          <dd class="teks-meta">1</dd>
        </div>
      </dl>
    </section>

    <section aria-labelledby="isi-judul" class="mt-12 grid gap-8 lg:grid-cols-12">
      <div class="lg:col-span-4">
        <h2 id="isi-judul" class="teks-meta text-teks-sekunder">Isi situs</h2>
      </div>
      <ul class="divide-y divide-garis-halus border-y border-garis-halus lg:col-span-8">
        @for (bagian of jalur; track bagian.jalur) {
          <li>
            <a
              [routerLink]="bagian.jalur"
              class="group grid grid-cols-[2rem_1fr_auto] items-baseline gap-4 py-5"
            >
              <span class="teks-meta text-teks-sekunder group-hover:text-sinyal">
                {{ bagian.nomor }}
              </span>
              <span>
                <span
                  class="block text-base underline-offset-4 group-hover:underline"
                  >{{ bagian.judul }}</span
                >
                <span class="mt-1 block text-sm text-teks-sekunder">{{ bagian.ringkas }}</span>
              </span>
              <span
                aria-hidden="true"
                class="text-teks-sekunder transition-transform duration-150 ease-keluar group-hover:translate-x-1 motion-reduce:transform-none"
              >
                &rarr;
              </span>
            </a>
          </li>
        }
      </ul>
    </section>

    <section aria-labelledby="pengurus-judul" class="mt-12 grid gap-8 lg:grid-cols-12">
      <div class="lg:col-span-4">
        <h2 id="pengurus-judul" class="teks-meta text-teks-sekunder">Pengurus</h2>
      </div>
      <div class="lg:col-span-8">
        <p class="max-w-[52ch] text-sm text-teks-sekunder">
          Situs ini dikelola pengurus kelas. Nama dan kontak pribadi pengurus tidak dipublikasikan
          di halaman ini; informasi yang dibutuhkan disampaikan langsung oleh pengurus.
        </p>
        <p class="mt-4 max-w-[52ch] text-sm text-teks-sekunder">
          Konten hanya dapat diubah oleh pengurus melalui panel administrasi.
        </p>
      </div>
    </section>
  `,
})
export class Tentang {
  protected readonly jalur = JALUR;
}