import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AlbumSummary } from '@kelas/contracts';
import { sumberSampul } from '../../inti/api/galeri.api';
import { gerakDikurangi, pantauMedia } from '../../inti/gerak/media';
import { hariBulan } from '../../inti/format/tanggal';

const KILAT_MS = 95;

function labelBingkai(indeks: number, jumlah: number): string {
  const lebar = Math.max(2, String(jumlah).length);

  return `${String(indeks + 1).padStart(lebar, '0')} / ${String(jumlah).padStart(lebar, '0')}`;
}

@Component({
  selector: 'kelas-rol-film',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (statis()) {
      <ul class="cadangan">
        @for (album of daftar(); track album.slug; let i = $index) {
          <li>
            <a [routerLink]="['/galeri', album.slug]">
              <span class="teks-meta text-teks-sekunder">{{ label(i) }}</span>
              <span class="nama">{{ album.title }}</span>
            </a>
          </li>
        }
      </ul>
    } @else {
      <div class="rol" #wadah [style.height.vh]="tinggiRail()">
        <div class="panggung">
          <div class="bingkai-rol">
            <div class="lubang lubang-kiri" #kiri aria-hidden="true"></div>
            <div class="lubang lubang-kanan" #kanan aria-hidden="true"></div>

            <div class="jendela">
              <div class="jalur" #jalur>
                @for (album of daftar(); track album.slug) {
                  <div class="kotak">
                    @if (album.cover; as sampul) {
                      <img
                        [src]="sumber(sampul.id)"
                        [attr.alt]="''"
                        [attr.width]="sampul.width"
                        [attr.height]="sampul.height"
                        loading="lazy"
                        decoding="async"
                      />
                    } @else {
                      <span class="kosong" aria-hidden="true"></span>
                    }
                  </div>
                }
              </div>

              <div class="tirai" #tirai aria-hidden="true"></div>
            </div>
          </div>

          <div class="catatan">
            <p class="teks-piksel text-sinyal">Rol {{ labelAktif() }}</p>

            @if (aktif(); as album) {
              <a class="tautan" [routerLink]="['/galeri', album.slug]">
                <span class="nama">{{ album.title }}</span>
              </a>

              <p class="teks-meta text-teks-sekunder">
                {{ tanggal(album) }} · {{ album.imageCount }} foto
              </p>
            }

            <p class="teks-meta mt-4 text-teks-sekunder">Gulir untuk memutar rol</p>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .rol {
      position: relative;
    }

    .panggung {
      position: sticky;
      top: 0;
      display: grid;
      height: 100svh;
      grid-template-rows: 1fr auto;
      place-items: center;
      overflow: hidden;
    }

    .bingkai-rol {
      position: relative;
      display: flex;
      width: min(100%, 27rem);
      align-items: stretch;
      gap: 0.5rem;
    }

    .lubang {
      flex: 0 0 0.7rem;
      border-radius: 3px;
      background-color: color-mix(in oklab, var(--color-teks-utama) 12%, transparent);
      background-image: radial-gradient(
        ellipse 0.26rem 0.42rem at center,
        var(--color-latar-halaman) 96%,
        transparent 100%
      );
      background-size: 0.7rem 1.35rem;
      background-repeat: repeat-y;
      background-position: center 0;
    }

    .jendela {
      position: relative;
      flex: 1 1 auto;
      overflow: hidden;
      height: clamp(10rem, 26svh, 16rem);
      border-radius: 4px;
      background-color: color-mix(in oklab, var(--color-teks-utama) 6%, transparent);
    }

    .jalur {
      display: flex;
      height: 100%;
      flex-direction: column;
      will-change: transform;
    }

    .kotak {
      position: relative;
      flex: 0 0 100%;
      height: 100%;
    }

    .kotak img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .kotak .kosong {
      display: block;
      width: 100%;
      height: 100%;
      background-image: repeating-linear-gradient(
        135deg,
        var(--color-garis-halus) 0 1px,
        transparent 1px 8px
      );
    }

    .tirai {
      position: absolute;
      inset: 0;
      background-color: var(--color-teks-utama);
      opacity: 0;
      pointer-events: none;
    }

    .tirai.denyut {
      animation: tutup-kejut ${KILAT_MS}ms steps(2, end) 1;
    }

    @keyframes tutup-kejut {
      0% {
        opacity: 0.86;
      }

      100% {
        opacity: 0;
      }
    }

    .catatan {
      width: min(100%, 27rem);
      padding: 0 0 clamp(2.5rem, 9vh, 5rem);
    }

    .catatan .nama {
      font-family: var(--font-serif);
      font-size: clamp(1.35rem, 3.6vw, 2rem);
      line-height: 1.08;
      letter-spacing: -0.028em;
    }

    .tautan {
      display: inline-block;
      margin-top: 0.5rem;
      text-decoration-thickness: 1px;
      text-underline-offset: 6px;
    }

    .tautan:hover .nama {
      text-decoration: underline;
      text-decoration-color: var(--color-sinyal);
    }

    .tautan:focus-visible {
      outline: 2px solid var(--color-sinyal);
      outline-offset: 4px;
    }

    .cadangan {
      display: grid;
      gap: 0.5rem;
    }

    .cadangan a {
      display: flex;
      width: 100%;
      min-height: 2.75rem;
      align-items: baseline;
      gap: 0.75rem;
      border-bottom: 1px solid var(--color-garis-halus);
      padding-block: 0.6rem;
      text-align: left;
    }

    .cadangan .nama {
      font-family: var(--font-serif);
      font-size: 1rem;
      letter-spacing: -0.01em;
    }

    .cadangan a:hover .nama {
      text-decoration: underline;
      text-underline-offset: 4px;
    }
  `,
})
export class RolFilm {
  readonly album = input.required<readonly AlbumSummary[]>();

  protected readonly daftar = computed(() => this.album());

  protected readonly tinggiRail = computed(() => {
    const jumlah = this.daftar().length;

    return Math.min(320, Math.max(165, 110 + jumlah * 34));
  });

  protected readonly indeks = signal(0);

  protected readonly kilat = signal(0);

  protected readonly aktif = computed(() => this.daftar()[this.indeks()]);

  protected readonly statis = signal(gerakDikurangi());

  protected readonly labelAktif = computed(() =>
    labelBingkai(this.indeks(), this.daftar().length),
  );

  protected label(indeks: number): string {
    return labelBingkai(indeks, this.daftar().length);
  }

  protected tanggal(album: AlbumSummary): string {
    const bagian = hariBulan(album.eventDate);

    return `${bagian.hari} ${bagian.bulan} ${bagian.tahun}`;
  }

  protected sumber(id: string): string {
    return sumberSampul(id);
  }

  private readonly wadah = viewChild<ElementRef<HTMLElement>>('wadah');
  private readonly jalur = viewChild<ElementRef<HTMLElement>>('jalur');
  private readonly kiri = viewChild<ElementRef<HTMLElement>>('kiri');
  private readonly kanan = viewChild<ElementRef<HTMLElement>>('kanan');
  private readonly tirai = viewChild<ElementRef<HTMLElement>>('tirai');
  private readonly pegang = inject(DestroyRef);

  private jumlahTerakhir = -1;
  private waktuKilat = 0;

  constructor() {
    this.pegang.onDestroy(() => {
      globalThis.clearTimeout(this.waktuKilat);
    });

    const lepas = pantauMedia(
      '(prefers-reduced-motion: reduce)',
      (kurang) => this.statis.set(kurang),
    );

    this.pegang.onDestroy(lepas);

    afterNextRender(() => this.pasangGulir());
  }

  private ubahIndeks(baru: number): void {
    const jumlah = this.daftar().length;
    const jepit = Math.min(Math.max(baru, 0), Math.max(jumlah - 1, 0));

    if (jepit === this.jumlahTerakhir) {
      return;
    }

    this.jumlahTerakhir = jepit;
    this.indeks.set(jepit);
    this.kilat.update((nilai) => nilai + 1);

    const tirai = this.tirai()?.nativeElement;

    if (tirai !== undefined) {
      tirai.classList.remove('denyut');
      void tirai.offsetWidth;
      tirai.classList.add('denyut');
    }

    globalThis.clearTimeout(this.waktuKilat);
    this.waktuKilat = globalThis.setTimeout(() => this.kilat.set(0), KILAT_MS * 4);
  }

  private pasangGulir(): void {
    const wadah = this.wadah()?.nativeElement;
    const jalur = this.jalur()?.nativeElement;

    if (wadah === undefined || jalur === undefined) {
      return;
    }

    const jendela = globalThis;
    let menunggu = 0;

    const gambar = (): void => {
      menunggu = 0;

      const kotak = wadah.getBoundingClientRect();
      const jumlah = this.daftar().length;

      if (jumlah < 2) {
        return;
      }

      const lintasan = Math.max(kotak.height - jendela.innerHeight, 1);
      const progres = Math.min(Math.max(-kotak.top / lintasan, 0), 1);
      const langkah = progres * (jumlah - 1);

      jalur.style.transform = `translate3d(0, ${(-langkah * 100) / jumlah}%, 0)`;

      const gulirLubang = -langkah * 1.35 * 18;

      for (const sisi of [this.kiri()?.nativeElement, this.kanan()?.nativeElement]) {
        if (sisi !== undefined) {
          sisi.style.backgroundPositionY = `${gulirLubang}rem`;
        }
      }

      this.ubahIndeks(Math.round(langkah));
    };

    const minta = (): void => {
      if (menunggu !== 0) {
        return;
      }

      menunggu = jendela.requestAnimationFrame(gambar);
    };

    jendela.addEventListener('scroll', minta, { passive: true });
    jendela.addEventListener('resize', minta, { passive: true });

    this.pegang.onDestroy(() => {
      jendela.removeEventListener('scroll', minta);
      jendela.removeEventListener('resize', minta);

      if (menunggu !== 0) {
        jendela.cancelAnimationFrame(menunggu);
      }
    });

    gambar();
  }
}