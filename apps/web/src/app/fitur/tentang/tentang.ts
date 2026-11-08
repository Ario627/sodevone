import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KartuPembuat } from '../../komponen/kartu-pembuat/kartu-pembuat';
import { MejaKerja } from '../../komponen/meja-kerja/meja-kerja';
import { PEMBUAT } from '../../inti/pembuat';

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

const KODE_KELAS = [
  { label: 'Tingkat', nilai: 'XI' },
  { label: 'Jurusan', nilai: 'PPLG' },
  { label: 'Rombel', nilai: '1' },
] as const;

@Component({
  selector: 'kelas-tentang',
  imports: [RouterLink, KartuPembuat, MejaKerja],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .bingkai-meja {
      border: 1px solid var(--color-garis-halus);
      background-color: var(--color-latar-sekunder);
      background-image: radial-gradient(
        ellipse 64% 52% at 50% 46%,
        color-mix(in oklab, var(--color-latar-panel) 92%, transparent) 0%,
        transparent 74%
      );
    }
  `,
  template: `
    <header class="border-b border-garis-halus pb-8">
      <div class="grid gap-8 lg:grid-cols-12 lg:items-end">
        <div class="lg:col-span-8">
          <p class="teks-meta bertanda text-sinyal">Identitas kelas</p>
          <h1
            class="mt-5 font-serif text-[clamp(2rem,5.5vw,3.25rem)] leading-[0.95] tracking-[-0.035em]"
          >
            Tentang kelas ini
          </h1>
          <p class="mt-5 max-w-[42ch] text-sm text-teks-kuat-sekunder">
            XI PPLG 1, jurusan Pengembangan Perangkat Lunak dan Gim. Situs ini kanal resmi kelas
            untuk pengumuman, agenda, dan dokumentasi.
          </p>
        </div>

        <dl class="grid grid-cols-3 gap-px border border-garis-halus bg-garis-halus lg:col-span-4">
          @for (kode of kodeKelas; track kode.label) {
            <div class="bg-latar-halaman px-3 py-3.5">
              <dt class="teks-meta text-teks-sekunder">{{ kode.label }}</dt>
              <dd class="mt-1.5 font-mono text-[1.5rem] leading-none tracking-[-0.06em]">
                {{ kode.nilai }}
              </dd>
            </div>
          }
        </dl>
      </div>
    </header>

    <section aria-labelledby="identitas-judul" class="mt-10 grid gap-6 lg:grid-cols-12">
      <div class="lg:col-span-3">
        <h2 id="identitas-judul" class="teks-meta flex items-baseline gap-3">
          <span aria-hidden="true" class="text-sinyal">01</span>
          <span class="text-teks-kuat-sekunder">Identitas</span>
        </h2>
      </div>
      <dl class="lg:col-span-9">
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

    <section aria-labelledby="isi-judul" class="mt-12 grid gap-6 lg:grid-cols-12">
      <div class="lg:col-span-3">
        <h2 id="isi-judul" class="teks-meta flex items-baseline gap-3">
          <span aria-hidden="true" class="text-sinyal">02</span>
          <span class="text-teks-kuat-sekunder">Isi situs</span>
        </h2>
      </div>
      <ul class="divide-y divide-garis-halus border-y border-garis-halus lg:col-span-9">
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
                <span class="block text-base underline-offset-4 group-hover:underline">{{
                  bagian.judul
                }}</span>
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

    <section aria-labelledby="pengurus-judul" class="mt-12 grid gap-6 lg:grid-cols-12">
      <div class="lg:col-span-3">
        <h2 id="pengurus-judul" class="teks-meta flex items-baseline gap-3">
          <span aria-hidden="true" class="text-sinyal">03</span>
          <span class="text-teks-kuat-sekunder">Pengurus</span>
        </h2>
      </div>
      <p class="max-w-[52ch] text-sm text-teks-sekunder lg:col-span-9">
        Dikelola pengurus kelas. Kontak pribadi tidak dipublikasikan.
      </p>
    </section>

    <section aria-labelledby="pembuat-judul" class="mt-12">
      <h2 id="pembuat-judul" class="teks-piksel mb-8 text-sinyal">Meja kerja</h2>

      <div class="grid gap-8 lg:grid-cols-12 lg:items-center">
        <div class="lg:col-span-5">
          <div class="bingkai-meja">
            <kelas-meja-kerja class="block aspect-square w-full" />
          </div>
          <p class="teks-meta mt-3 text-teks-sekunder">Geser untuk memutar</p>
        </div>

        <div class="lg:col-span-7">
          <kelas-kartu-pembuat [orang]="pembuat" />
        </div>
      </div>
    </section>
  `,
})
export class Tentang {
  protected readonly jalur = JALUR;
  protected readonly kodeKelas = KODE_KELAS;
  protected readonly pembuat = PEMBUAT;
}
