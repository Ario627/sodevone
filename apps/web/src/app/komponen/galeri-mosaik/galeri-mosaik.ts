import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AlbumSummary } from '@kelas/contracts';
import { srcsetSampul, sumberSampul } from '../../inti/api/galeri.api';
import { nomorUrut } from '../../inti/format/label';
import { tanggalTeks } from '../../inti/format/tanggal';
import { bolehBergerak } from '../../inti/gerak/media';
import { AngkaPiksel } from '../angka-piksel/angka-piksel';

type Bentang = 'fitur' | 'lebar' | 'tinggi' | 'kotak';

const POLA: readonly Bentang[] = ['fitur', 'kotak', 'kotak', 'lebar'];

function bentangDari(indeks: number): Bentang {
  return POLA[indeks % POLA.length] ?? 'kotak';
}

@Component({
  selector: 'kelas-galeri-mosaik',
  imports: [RouterLink, AngkaPiksel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <ul class="mosaik">
      @for (item of album(); track item.slug; let i = $index) {
        <li class="petak" [class]="'petak-' + bentang(i)">
          <a
            [routerLink]="['/galeri', item.slug]"
            class="ubin"
            (pointermove)="miringkan($event, $event.currentTarget)"
            (pointerleave)="luruskan($event)"
            [style.--nomor]="i"
          >
            <span class="gambar">
              @if (item.cover; as sampul) {
                <img
                  [src]="sumberSampul(sampul.id)"
                  [attr.srcset]="srcsetSampul(sampul.id)"
                  sizes="(min-width: 64rem) 30rem, 50vw"
                  [attr.width]="sampul.width"
                  [attr.height]="sampul.height"
                  [attr.alt]="sampul.altText ?? item.title"
                  [attr.loading]="i < 4 ? 'eager' : 'lazy'"
                  [attr.fetchpriority]="i === 0 ? 'high' : undefined"
                  decoding="async"
                />
              } @else {
                <span class="tanpa">Tanpa sampul</span>
              }
            </span>

            <span class="lapis-gelap" aria-hidden="true"></span>

            <span class="tanda">
              <kelas-angka-piksel [teks]="nomorUrut(awal() + i)" [tinggi]="10" />
            </span>

            <span class="keterangan">
              <span class="waktu">{{ tanggalTeks(item.eventDate) }}</span>
              <span class="nama">{{ item.title }}</span>
              <span class="meta">{{ item.imageCount }} foto</span>
            </span>
          </a>
        </li>
      }
    </ul>
  `,
  styles: `
    .mosaik {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-auto-rows: 8.5rem;
      grid-auto-flow: dense;
      gap: 0.75rem;
    }

    .petak {
      min-width: 0;
    }

    .petak-fitur {
      grid-column: span 2;
      grid-row: span 2;
    }

    .petak-lebar {
      grid-column: span 2;
    }

    .petak-tinggi {
      grid-row: span 2;
    }

    .ubin {
      position: relative;
      display: block;
      height: 100%;
      border: 1px solid var(--color-garis-halus);
      background-color: var(--color-latar-sekunder);
      overflow: hidden;
      transform: perspective(900px) rotateX(var(--putar-x, 0deg)) rotateY(var(--putar-y, 0deg))
        translateZ(0);
      transform-style: preserve-3d;
      transition:
        transform 320ms var(--ease-keluar),
        border-color 200ms var(--ease-keluar),
        box-shadow 320ms var(--ease-keluar);
    }

    .ubin:hover {
      border-color: var(--color-garis-tegas);
      box-shadow: 0 18px 40px -24px rgb(0 0 0 / 0.45);
    }

    .gambar {
      display: block;
      height: 100%;
    }

    .gambar img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 900ms var(--ease-keluar);
    }

    .ubin:hover .gambar img {
      transform: scale(1.06);
    }

    .tanpa {
      display: flex;
      height: 100%;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-teks-sekunder);
    }

    .lapis-gelap {
      position: absolute;
      inset: 0;
      background-image: linear-gradient(
        to top,
        rgb(15 14 13 / 0.82) 0%,
        rgb(15 14 13 / 0.38) 34%,
        transparent 68%
      );
      opacity: 0;
      transition: opacity 260ms var(--ease-keluar);
    }

    .keterangan .nama,
    .keterangan .meta,
    .keterangan .waktu {
      display: block;
    }

    .keterangan {
      position: absolute;
      inset-inline: 0.85rem;
      bottom: 0.8rem;
      color: #f5f2ec;
      transform: translateY(0.4rem);
      opacity: 0;
      transition:
        opacity 260ms var(--ease-keluar),
        transform 320ms var(--ease-keluar);
    }

    .keterangan .waktu,
    .keterangan .meta {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.78;
    }

    .keterangan .nama {
      margin-block: 0.15rem 0.1rem;
      font-family: var(--font-serif);
      font-size: 1.0625rem;
      line-height: 1.2;
      letter-spacing: -0.015em;
    }

    .ubin:hover .lapis-gelap,
    .ubin:focus-visible .lapis-gelap {
      opacity: 1;
    }

    .ubin:hover .keterangan,
    .ubin:focus-visible .keterangan {
      opacity: 1;
      transform: translateY(0);
    }

    .tanda {
      position: absolute;
      inset-block-start: 0.6rem;
      inset-inline-start: 0.6rem;
      padding: 0.3rem 0.4rem;
      background-color: var(--color-latar-halaman);
      color: var(--color-teks-kuat-sekunder);
      opacity: 0.92;
      transition: opacity 220ms var(--ease-keluar);
    }

    .ubin:hover .tanda {
      opacity: 0;
    }

    @media (min-width: 40rem) {
      .mosaik {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        grid-auto-rows: 11rem;
        gap: 1rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .ubin,
      .gambar img,
      .lapis-gelap,
      .keterangan {
        transition: none;
      }

      .ubin {
        transform: none;
      }
    }

    @media (hover: none) {
      .lapis-gelap {
        opacity: 1;
        background-image: linear-gradient(
          to top,
          rgb(15 14 13 / 0.86) 0%,
          rgb(15 14 13 / 0.3) 42%,
          transparent 74%
        );
      }

      .keterangan {
        opacity: 1;
        transform: none;
      }

      .tanda {
        display: none;
      }
    }
  `,
})
export class GaleriMosaik {
  readonly album = input.required<readonly AlbumSummary[]>();
  readonly awal = input(1);

  protected readonly nomorUrut = nomorUrut;
  protected readonly tanggalTeks = tanggalTeks;
  protected readonly sumberSampul = sumberSampul;
  protected readonly srcsetSampul = srcsetSampul;

  protected bentang(indeks: number): Bentang {
    return bentangDari(indeks);
  }

  protected miringkan(peristiwa: PointerEvent, sasaran: EventTarget | null): void {
    const simpul = sasaran instanceof HTMLElement ? sasaran : null;

    if (simpul === null || !bolehBergerak()) {
      return;
    }

    const kotak = simpul.getBoundingClientRect();
    const x = (peristiwa.clientX - kotak.left) / Math.max(kotak.width, 1) - 0.5;
    const y = (peristiwa.clientY - kotak.top) / Math.max(kotak.height, 1) - 0.5;

    simpul.style.setProperty('--putar-y', `${(x * 7).toFixed(2)}deg`);
    simpul.style.setProperty('--putar-x', `${(-y * 7).toFixed(2)}deg`);
  }

  protected luruskan(peristiwa: PointerEvent): void {
    const sasaran = peristiwa.currentTarget;

    if (!(sasaran instanceof HTMLElement)) {
      return;
    }

    sasaran.style.removeProperty('--putar-y');
    sasaran.style.removeProperty('--putar-x');
  }
}