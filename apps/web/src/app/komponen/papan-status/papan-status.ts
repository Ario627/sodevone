import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

const SATU_HARI = 86_400_000;

const FORMAT_JAM = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'Asia/Jakarta',
});

export function dua(nilai: number): string {
  return String(Math.max(nilai, 0)).padStart(2, '0');
}

export function sisa(selisih: number): string {
  const total = Math.max(selisih, 0);
  const hari = Math.floor(total / SATU_HARI);
  const jam = Math.floor((total % SATU_HARI) / 3_600_000);
  const menit = Math.floor((total % 3_600_000) / 60_000);
  const detik = Math.floor((total % 60_000) / 1_000);

  return hari > 0
    ? `${hari} hari ${dua(jam)}:${dua(menit)}:${dua(detik)}`
    : `${dua(jam)}:${dua(menit)}:${dua(detik)}`;
}

@Component({
  selector: 'kelas-papan-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block border-y border-garis-halus' },
  template: `
    <div class="baris">
      <div class="sel">
        <span class="nyala" aria-hidden="true"></span>
        <span class="teks-meta kunci">Waktu</span>
        <span class="nilai">{{ jam() }}</span>
        <span class="teks-meta zona">WIB</span>
      </div>

      <span class="pisah" aria-hidden="true"></span>

      @if (mulai(); as waktu) {
        <div class="sel sel-lebar">
          <span class="teks-meta kunci">Berikutnya</span>
          <span class="nilai nilai-kecil">{{ judul() }}</span>
        </div>

        <span class="pisah" aria-hidden="true"></span>

        <div class="sel">
          <span class="teks-meta kunci">Menuju</span>
          <span class="nilai angka">{{ sisaTeks() }}</span>
        </div>
      } @else {
        <div class="sel sel-lebar">
          <span class="teks-meta kunci">Agenda</span>
          <span class="nilai nilai-kecil">Belum ada kegiatan terjadwal</span>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .baris {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem 0;
      padding-block: 0.7rem;
      overflow: hidden;
    }

    .sel {
      display: flex;
      align-items: baseline;
      gap: 0.55rem;
      padding-inline: clamp(0.75rem, 1.8vw, 1.15rem);
      min-width: 0;
    }

    .sel:first-child {
      padding-inline-start: 0;
    }

    .sel-lebar {
      flex: 1 1 12rem;
      min-width: 0;
    }

    .kunci {
      color: var(--color-teks-sekunder);
      font-size: 0.625rem;
    }

    .nilai {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.02em;
      line-height: 1.3;
      color: var(--color-teks-utama);
      white-space: nowrap;
    }

    .nilai-kecil {
      overflow: hidden;
      font-size: 0.8125rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .angka {
      color: var(--color-sinyal);
    }

    .zona {
      color: var(--color-garis-tegas);
      font-size: 0.625rem;
    }

    .nyala {
      inline-size: 0.3125rem;
      block-size: 0.3125rem;
      background-color: var(--color-berhasil);
      animation: kedip 2.4s ease-in-out infinite;
    }

    .pisah {
      inline-size: 1px;
      block-size: 0.9rem;
      background-color: var(--color-garis-halus);
    }

    @keyframes kedip {
      0%,
      100% {
        opacity: 1;
      }

      50% {
        opacity: 0.25;
      }
    }

    @media (max-width: 40rem) {
      .kunci {
        display: none;
      }

      .sel-lebar {
        flex-basis: 100%;
        order: 3;
        padding-inline: 0;
        padding-block-start: 0.35rem;
      }

      .pisah:last-of-type {
        display: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .nyala {
        animation: none;
      }
    }
  `,
})
export class PapanStatus {
  readonly mulai = input<string | undefined>();

  readonly judul = input('');

  private readonly pegang = inject(DestroyRef);
  private readonly jamSekarang = signal(new Date());

  protected readonly jam = computed(() => FORMAT_JAM.format(this.jamSekarang()));

  protected readonly sisaTeks = computed(() => {
    const waktu = this.mulai();

    if (waktu === undefined) {
      return '';
    }

    return sisa(new Date(waktu).getTime() - this.jamSekarang().getTime());
  });

  constructor() {
    afterNextRender(() => {
      const detak = setInterval(() => this.jamSekarang.set(new Date()), 1000);

      this.pegang.onDestroy(() => clearInterval(detak));
    });
  }
}