import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { SlugSchema } from '@kelas/contracts';
import { toApiFailure } from '../../inti/api/dasar';
import { bacaKegiatan, permintaanKegiatan } from '../../inti/api/agenda.api';
import { rentangJam, tanggalPanjangTeks, tanggalTeks } from '../../inti/format/tanggal';
import { GalatMuat } from '../../komponen/galat-muat/galat-muat';
import { Memuat } from '../../komponen/memuat/memuat';

@Component({
  selector: 'kelas-detail-agenda',
  imports: [RouterLink, Memuat, GalatMuat],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (tidakDitemukan()) {
      <section class="max-w-[34rem]">
        <p class="teks-meta text-sinyal">Galat 404</p>
        <h1 class="mt-4 font-serif text-3xl tracking-[-0.02em]">Kegiatan tidak ditemukan</h1>
        <p class="mt-4 text-md text-teks-kuat-sekunder">
          Kegiatan ini tidak tersedia atau sudah tidak dipublikasikan.
        </p>
        <a
          routerLink="/agenda"
          class="mt-8 inline-flex min-h-11 items-center gap-2 border-b border-garis-tegas text-sm transition-colors duration-100 ease-keluar hover:border-sinyal hover:text-sinyal"
        >
          <span aria-hidden="true">&larr;</span> Semua agenda
        </a>
      </section>
    } @else if (sedangMemuat()) {
      <kelas-memuat pesan="Memuat kegiatan" [jumlah]="2" />
    } @else if (galat(); as kegagalan) {
      <kelas-galat-muat
        [pesan]="kegagalan.message"
        [korelasi]="kegagalan.correlationId"
        (cobaLagi)="muatUlang()"
      />
    } @else if (data(); as kegiatan) {
      <nav aria-label="Remah" class="teks-meta text-teks-sekunder">
        <ol class="flex flex-wrap items-center gap-2">
          <li><a routerLink="/" class="hover:text-teks-utama">Beranda</a></li>
          <li aria-hidden="true">/</li>
          <li><a routerLink="/agenda" class="hover:text-teks-utama">Agenda</a></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" class="max-w-[18rem] truncate text-teks-utama">
            {{ kegiatan.title }}
          </li>
        </ol>
      </nav>

      <article class="mt-8 max-w-[62ch]">
        <header class="border-b border-garis-halus pb-6">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
            <time [attr.datetime]="kegiatan.startsAt" class="teks-meta text-sinyal">
              {{ tanggalTeks(kegiatan.startsAt) }}
            </time>
            <span class="teks-meta text-teks-sekunder">
              {{ rentangJam(kegiatan.startsAt, kegiatan.endsAt) }} WIB
            </span>
            @if (kegiatan.state === 'archived') {
              <span class="teks-meta border border-garis-tegas px-2 py-0.5">Arsip</span>
            }
          </div>

          <h1
            class="mt-4 font-serif text-[clamp(1.75rem,4.5vw,2.75rem)] leading-[1.05] tracking-[-0.025em]"
          >
            {{ kegiatan.title }}
          </h1>

          <p class="mt-4 text-sm text-teks-kuat-sekunder">
            {{ tanggalPanjangTeks(kegiatan.startsAt) }}
            @if (kegiatan.location; as lokasi) {
              <span class="block text-teks-sekunder">{{ lokasi }}</span>
            }
          </p>
        </header>

        @if (kegiatan.description; as keterangan) {
          <p class="prosa mt-8">{{ keterangan }}</p>
        } @else {
          <p class="mt-8 text-sm text-teks-sekunder">
            Belum ada keterangan tambahan untuk kegiatan ini.
          </p>
        }

        <footer class="mt-10 border-t border-garis-halus pt-5">
          <a
            routerLink="/agenda"
            class="inline-flex min-h-11 items-center gap-2 border-b border-garis-tegas text-sm transition-colors duration-100 ease-keluar hover:border-sinyal hover:text-sinyal"
          >
            <span aria-hidden="true">&larr;</span> Semua agenda
          </a>
        </footer>
      </article>
    }
  `,
})
export class DetailAgenda {
  private readonly judulHalaman = inject(Title);

  readonly slug = input.required<string>();

  protected readonly slugValid = computed(() => SlugSchema.safeParse(this.slug()).success);

  private readonly sumber = httpResource(
    () => (this.slugValid() ? permintaanKegiatan(this.slug()) : undefined),
    { parse: bacaKegiatan },
  );

  protected readonly sedangMemuat = this.sumber.isLoading;
  protected readonly data = computed(() => {
    const sumber = this.sumber;

    return sumber.hasValue() ? sumber.value() : undefined;
  });
  protected readonly galat = computed(() => {
    const kegagalan = this.sumber.error();

    return kegagalan === undefined ? undefined : toApiFailure(kegagalan);
  });

  protected readonly tidakDitemukan = computed(
    () => !this.slugValid() || this.galat()?.missing === true,
  );

  protected readonly tanggalTeks = tanggalTeks;
  protected readonly tanggalPanjangTeks = tanggalPanjangTeks;
  protected readonly rentangJam = rentangJam;

  constructor() {
    effect(() => {
      const kegiatan = this.data();

      if (kegiatan !== undefined) {
        this.judulHalaman.setTitle(`${kegiatan.title} — Kelas XI PPLG 1`);
      }
    });
  }

  protected muatUlang(): void {
    this.sumber.reload();
  }
}