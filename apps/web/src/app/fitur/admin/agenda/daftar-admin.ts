import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EventAdminListQuery, EventStatus } from '@kelas/contracts';
import { bacaHalamanAgenda, permintaanHalamanAgenda } from '../../../inti/api/admin-agenda.api';
import { toApiFailure } from '../../../inti/api/dasar';
import { hariBulan, jamTeks } from '../../../inti/format/tanggal';
import { GalatMuat } from '../../../komponen/galat-muat/galat-muat';
import { Memuat } from '../../../komponen/memuat/memuat';

const LABEL_STATUS: Record<EventStatus, string> = {
  draft: 'Draf',
  published: 'Terbit',
  archived: 'Arsip',
};

const PER_HALAMAN = 20;

@Component({
  selector: 'kelas-daftar-admin-agenda',
  imports: [RouterLink, Memuat, GalatMuat],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <h1 class="font-serif text-2xl leading-tight tracking-[-0.03em] sm:text-3xl">Agenda</h1>
        <p class="mt-2 max-w-[46ch] text-sm text-teks-kuat-sekunder">
          Nama kegiatan, tempat, dan waktunya bisa diubah kapan saja. Foto pendukung diambil dari
          album galeri.
        </p>
      </div>

      <a
        routerLink="/admin/agenda/baru"
        class="teks-meta inline-flex min-h-11 items-center border-b border-garis-tegas pb-1 transition-colors duration-100 ease-keluar hover:border-sinyal hover:text-sinyal"
        >Kegiatan baru</a
      >
    </div>

    <div class="mt-6 flex flex-wrap items-center gap-2">
      @for (pilihan of saringan; track pilihan.label) {
        <button
          type="button"
          class="teks-meta inline-flex min-h-11 items-center border px-3 transition-colors duration-100 ease-keluar"
          [class]="
            status() === pilihan.nilai
              ? 'border-sinyal text-sinyal'
              : 'border-garis-halus text-teks-sekunder hover:border-garis-tegas'
          "
          (click)="ubahStatus(pilihan.nilai)"
        >
          {{ pilihan.label }}
        </button>
      }
    </div>

    @if (sedangMemuat()) {
      <kelas-memuat class="mt-8" pesan="Memuat agenda" [jumlah]="4" />
    } @else if (galat(); as kegagalan) {
      <kelas-galat-muat
        class="mt-8"
        [pesan]="kegagalan.message"
        [korelasi]="kegagalan.correlationId"
        (cobaLagi)="muatUlang()"
      />
    } @else if (daftar().length === 0) {
      <p class="mt-8 border-y border-garis-halus py-5 text-sm text-teks-sekunder">
        Belum ada kegiatan pada saringan ini.
      </p>
    } @else {
      <ul class="mt-8 border-t border-garis-halus">
        @for (kegiatan of daftar(); track kegiatan.id) {
          <li class="border-b border-garis-halus">
            <a
              [routerLink]="['/admin/agenda', kegiatan.id]"
              class="group grid gap-x-4 gap-y-1 py-3.5 sm:grid-cols-[4.6rem_minmax(0,1fr)_7rem_5rem] sm:items-baseline"
            >
              <span class="teks-meta text-teks-sekunder">{{ tanggal(kegiatan.startsAt) }}</span>

              <span class="min-w-0">
                <span
                  class="block truncate font-serif text-base tracking-[-0.01em] underline-offset-4 group-hover:underline"
                  >{{ kegiatan.title }}</span
                >
                <span class="teks-meta mt-0.5 block text-teks-sekunder">
                  {{ jam(kegiatan.startsAt) }}
                  @if (kegiatan.location) {
                    · {{ kegiatan.location }}
                  }
                </span>
              </span>

              <span class="teks-meta text-teks-sekunder">{{ label(kegiatan.status) }}</span>

              <span class="teks-meta text-right text-teks-sekunder">v{{ kegiatan.version }}</span>
            </a>
          </li>
        }
      </ul>
    }
  `,
})
export class DaftarAdminAgenda {
  protected readonly saringan = [
    { label: 'Semua', nilai: undefined },
    { label: 'Draf', nilai: 'draft' as EventStatus },
    { label: 'Terbit', nilai: 'published' as EventStatus },
    { label: 'Arsip', nilai: 'archived' as EventStatus },
  ];

  protected readonly status = signal<EventStatus | undefined>('published');

  protected readonly query = computed<EventAdminListQuery>(() => ({
    page: 1,
    perPage: PER_HALAMAN,
    status: this.status(),
  }));

  private readonly sumber = httpResource(() => permintaanHalamanAgenda(this.query()), {
    parse: bacaHalamanAgenda,
  });

  protected readonly sedangMemuat = this.sumber.isLoading;

  protected readonly galat = computed(() => {
    const kegagalan = this.sumber.error();

    return kegagalan === undefined ? undefined : toApiFailure(kegagalan);
  });

  protected readonly daftar = computed(() => {
    const sumber = this.sumber;

    return sumber.hasValue() ? sumber.value().items : [];
  });

  protected ubahStatus(nilai: EventStatus | undefined): void {
    this.status.set(nilai);
  }

  protected label(nilai: EventStatus): string {
    return LABEL_STATUS[nilai];
  }

  protected tanggal(iso: string): string {
    const bagian = hariBulan(iso);

    return `${bagian.hari} ${bagian.bulan}`;
  }

  protected jam(iso: string): string {
    return jamTeks(iso);
  }

  protected muatUlang(): void {
    this.sumber.reload();
  }
}