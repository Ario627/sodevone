import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AlbumSummary } from '@kelas/contracts';
import { srcsetSampul, sumberSampul } from '../../inti/api/galeri.api';
import { hariBulan } from '../../inti/format/tanggal';

const HERO_RASIO = 1.42;
const TINGGI_RASIO = 0.82;

type Bentuk = 'hero' | 'lebar' | 'tinggi' | 'kotak';

function kolomUntuk(jumlah: number): number {
  if (jumlah <= 2) {
    return 2;
  }

  if (jumlah <= 4) {
    return 3;
  }

  if (jumlah <= 9) {
    return 4;
  }

  return 5;
}

function bentukDari(
  album: AlbumSummary,
  indeks: number,
  pakaiHero: boolean,
  bolehLebar: boolean,
): Bentuk {
  if (pakaiHero && indeks === 0) {
    return 'hero';
  }

  const sampul = album.cover;

  if (sampul === null) {
    return bolehLebar && indeks % 5 === 0 ? 'lebar' : 'kotak';
  }

  const rasio = sampul.width / Math.max(sampul.height, 1);

  if (bolehLebar && rasio >= HERO_RASIO) {
    return 'lebar';
  }

  if (rasio <= TINGGI_RASIO) {
    return 'tinggi';
  }

  return 'kotak';
}

function nomor(indeks: number): string {
  return String(indeks + 1).padStart(2, '0');
}

@Component({
  selector: 'kelas-puzzle-foto',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="puzzle" [style.--kolom]="kolom()">
      @for (album of album(); track album.slug; let i = $index) {
        <li class="ubin" [class]="'ubin-' + buat(album, i)">
          <a [routerLink]="['/galeri', album.slug]" class="tautan">
            @if (album.cover; as sampul) {
              <img
                [src]="sumber(sampul.id)"
                [attr.srcset]="srcset(sampul.id)"
                sizes="(max-width: 40rem) 46vw, (max-width: 64rem) 30vw, 22vw"
                [attr.alt]="sampul.altText ?? album.title"
                [attr.width]="sampul.width"
                [attr.height]="sampul.height"
                [attr.loading]="i < 4 ? 'eager' : 'lazy'"
                decoding="async"
              />
            } @else {
              <span class="kosong" aria-hidden="true">
                <span class="angka">{{ nomor(i) }}</span>
              </span>
            }

            <span class="lapis" aria-hidden="true"></span>

            <span class="catatan">
              <span class="teks-meta nomor">{{ nomor(i) }}</span>

              @if (album.cover === null) {
                <span class="judul">{{ album.title }}</span>
              }

              <span class="teks-meta rinci">
                {{ tanggal(album) }} · {{ album.imageCount }} foto
              </span>
            </span>
          </a>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
    }

    .puzzle {
      display: grid;
      grid-auto-flow: dense;
      grid-auto-rows: var(--satuan);
      grid-template-columns: repeat(var(--kolom), minmax(0, 1fr));
      gap: var(--celah);
      --satuan: clamp(4.6rem, 11vw, 7.6rem);
      --celah: clamp(0.35rem, 0.8vw, 0.6rem);
    }

    @media (min-width: 72rem) {
      .puzzle {
        --satuan: clamp(5.4rem, 8.4vw, 8.2rem);
      }
    }

    .ubin {
      position: relative;
      overflow: hidden;
      grid-column: span 1;
      grid-row: span 3;
      border-radius: 2px;
      background-color: var(--color-latar-sekunder);
    }

    .ubin-lebar {
      grid-column: span 2;
    }

    .ubin-hero {
      grid-column: span 2;
    }

    .tautan {
      position: absolute;
      inset: 0;
      display: block;
      outline-offset: -2px;
    }

    .tautan:focus-visible {
      outline: 2px solid var(--color-sinyal);
    }

    .tautan img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 420ms var(--ease-keluar);
    }

    .tautan:hover img {
      transform: scale(1.028);
    }

    .kosong {
      display: grid;
      width: 100%;
      height: 100%;
      place-items: center;
      background-image: repeating-linear-gradient(
        135deg,
        var(--color-garis-halus) 0 1px,
        transparent 1px 9px
      );
    }

    .kosong .angka {
      font-family: var(--font-piksel);
      font-size: 1.15rem;
      color: var(--color-garis-tegas);
    }

    .lapis {
      position: absolute;
      inset: 0;
      background-image: linear-gradient(
        to top,
        color-mix(in oklab, var(--color-latar-tirai) 72%, transparent) 0%,
        transparent 46%
      );
      opacity: 0;
      transition: opacity 220ms var(--ease-keluar);
    }

    .ubin-hero .lapis,
    .tautan:hover .lapis,
    .tautan:focus-visible .lapis {
      opacity: 1;
    }

    .catatan {
      position: absolute;
      inset-inline: 0;
      bottom: 0;
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.15rem 0.45rem;
      padding: 0.55rem 0.6rem 0.6rem;
      color: var(--color-teks-terbalik);
      opacity: 0;
      transform: translate3d(0, 0.3rem, 0);
      transition:
        opacity 220ms var(--ease-keluar),
        transform 260ms var(--ease-keluar);
    }

    .ubin-hero .catatan,
    .tautan:hover .catatan,
    .tautan:focus-visible .catatan {
      opacity: 1;
      transform: none;
    }

    .nomor {
      opacity: 0.66;
    }

    .judul {
      font-family: var(--font-serif);
      font-size: 0.95rem;
      line-height: 1.15;
      letter-spacing: -0.01em;
    }

    .rinci {
      opacity: 0.72;
    }

    @media (hover: none) {
      .catatan {
        opacity: 1;
        transform: none;
      }

      .lapis {
        opacity: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .tautan img,
      .lapis,
      .catatan {
        transition: none;
      }

      .tautan:hover img {
        transform: none;
      }
    }
  `,
})
export class PuzzleFoto {
  readonly album = input.required<readonly AlbumSummary[]>();

  protected readonly nomor = nomor;

  protected readonly kolom = computed(() => String(kolomUntuk(this.album().length)));

  protected readonly pakaiHero = computed(() => this.album().length >= 4);

  protected buat(album: AlbumSummary, indeks: number): Bentuk {
    const kolom = kolomUntuk(this.album().length);

    return bentukDari(album, indeks, this.pakaiHero(), kolom >= 4);
  }

  protected tanggal(album: AlbumSummary): string {
    const bagian = hariBulan(album.eventDate);

    return `${bagian.hari} ${bagian.bulan}`;
  }

  protected sumber(id: string): string {
    return sumberSampul(id);
  }

  protected srcset(id: string): string {
    return srcsetSampul(id);
  }
}