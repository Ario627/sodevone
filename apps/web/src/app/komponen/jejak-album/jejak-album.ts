import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
  computed
} from '@angular/core';
import type { AlbumSummary } from '@kelas/contracts';
import { srcsetSampul, sumberSampul } from '../../inti/api/galeri.api';
import { nomorUrut } from '../../inti/format/label';
import { tanggalTeks } from '../../inti/format/tanggal';
import { muatAlatGulir } from '../../inti/gerak/gulir';
import { gerakDikurangi } from '../../inti/gerak/media';
import { jalurLembut } from '../../inti/kelas/lintasan';
import { AngkaPiksel } from '../angka-piksel/angka-piksel';

const JARAK_GULIR = 24;
const LERAP = 0.13;
const SKALA_JAUH = 0.6;
const SKALA_DEKAT = 0.42;
const PUDAR_JAUH = 1.24;
const PUTAR_MAKS = 8;
const SAMPEL = 64;
const GESER_SISI = 11;
const LIUK = 0.17;

interface Contoh {
  readonly l: number;
  readonly y: number;
}

@Component({
  selector: 'kelas-jejak-album',
  imports: [AngkaPiksel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '[class.statis]': 'statis()' },
  template: `
    <div #rel class="rel" [style.height]="tinggiAwal()">
      <div class="panggung">
        <div class="kisi" aria-hidden="true"></div>

        <div #lapis class="lapis">
          <svg #benang class="benang" aria-hidden="true" focusable="false">
            <path #jalur class="jalur-dasar" fill="none" />
            <path #jejak class="jalur-isi" fill="none" />
            <circle #ujung class="jalur-ujung" r="3.5" />
          </svg>

          <div #tumpuk class="tumpuk">
            @for (item of album(); track item.slug; let i = $index) {
              <figure #kartu class="kartu">
                <button
                  type="button"
                  class="bingkai"
                  [attr.aria-label]="'Perbesar foto album ' + item.title"
                  (click)="bukaFoto.emit(item)"
                >
                  @if (item.cover; as sampul) {
                    <img
                      [src]="sumberSampul(sampul.id)"
                      [attr.srcset]="srcsetSampul(sampul.id)"
                      sizes="(min-width: 64rem) 30rem, (min-width: 40rem) 60vw, 88vw"
                      [attr.width]="sampul.width"
                      [attr.height]="sampul.height"
                      [attr.alt]="sampul.altText ?? item.title"
                      [attr.loading]="i < 2 ? 'eager' : 'lazy'"
                      decoding="async"
                    />
                  } @else {
                    <span class="tanpa">Tanpa sampul</span>
                  }
                </button>

                <figcaption class="ket">
                  <span class="nomor" aria-hidden="true">
                    <kelas-angka-piksel [teks]="nomorUrut(i + 1)" [tinggi]="10" />
                  </span>
                  <span class="teks-meta">{{ tanggalTeks(item.eventDate) }}</span>
                  <span class="pisah" aria-hidden="true"></span>
                  <span class="teks-meta">{{ item.imageCount }} foto</span>
                </figcaption>

                <p class="judul">{{ item.title }}</p>
              </figure>
            }
          </div>
        </div>

        <div class="hud" aria-hidden="true">
          <span class="hud-nomor">
            <kelas-angka-piksel [teks]="nomorUrut(aktif() + 1)" [tinggi]="13" />
          </span>
          <span class="hud-garis"></span>
          <span class="hud-judul">{{ judulAktif() }}</span>
          <span class="hud-total">{{ nomorUrut(jumlah()) }}</span>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .rel {
      position: relative;
    }

    .panggung {
      position: sticky;
      top: 0;
      display: block;
      height: 100svh;
      overflow: clip;
    }

    .kisi {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image:
        linear-gradient(to right, var(--color-garis-halus) 0 1px, transparent 1px 100%),
        linear-gradient(to bottom, var(--color-garis-halus) 0 1px, transparent 1px 100%);
      background-size: 5rem 5rem;
      opacity: 0.42;
      mask-image: radial-gradient(ellipse 70% 62% at 50% 50%, #000 20%, transparent 78%);
    }

    .lapis {
      position: relative;
      width: 100%;
      will-change: transform;
    }

    .benang {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .jalur-dasar {
      stroke: var(--color-garis-tegas);
      stroke-width: 1;
      stroke-dasharray: 2 7;
      opacity: 0.9;
    }

    .jalur-isi {
      stroke: var(--color-sinyal);
      stroke-width: 2.5;
      stroke-linecap: round;
      filter: drop-shadow(0 0 6px color-mix(in oklab, var(--color-sinyal) 45%, transparent));
    }

    .jalur-ujung {
      fill: var(--color-sinyal);
    }

    .tumpuk {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 26vh;
      padding-block: 38vh;
      perspective: 1500px;
    }

    .kartu {
      width: min(100%, 38rem);
      margin-inline: auto;
      transform-origin: center;
      will-change: transform, opacity;
    }

    .bingkai {
      display: block;
      width: 100%;
      border: 1px solid var(--color-garis-halus);
      background-color: var(--color-latar-sekunder);
      padding: 0;
      cursor: zoom-in;
      overflow: hidden;
    }

    .bingkai img {
      display: block;
      width: 100%;
      height: auto;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      transition: transform 700ms var(--ease-keluar);
    }

    .bingkai:hover img {
      transform: scale(1.03);
    }

    .tanpa {
      display: flex;
      aspect-ratio: 4 / 3;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-teks-sekunder);
    }

    .ket {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-block-start: 0.9rem;
      color: var(--color-teks-sekunder);
    }

    .nomor {
      color: var(--color-garis-tegas);
    }

    .pisah {
      width: 1px;
      height: 0.75rem;
      background-color: var(--color-garis-tegas);
    }

    .judul {
      margin-block-start: 0.35rem;
      font-family: var(--font-serif);
      font-size: 1.3125rem;
      line-height: 1.2;
      letter-spacing: -0.015em;
      color: var(--color-teks-utama);
    }

    .hud {
      position: absolute;
      inset-inline-end: max(1.25rem, calc((100% - 76rem) / 2 + 2rem));
      bottom: 2rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--color-teks-sekunder);
    }

    .hud-nomor {
      color: var(--color-sinyal);
    }

    .hud-garis {
      width: clamp(2rem, 8vw, 5rem);
      height: 1px;
      background-color: var(--color-garis-tegas);
    }

    .hud-judul {
      max-width: 16ch;
      overflow: hidden;
      font-size: var(--text-xs);
      line-height: 1.3;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .hud-total {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      opacity: 0.7;
    }

    @media (max-width: 47.99rem) {
      .hud {
        inset-inline-end: 1.25rem;
        bottom: 1.25rem;
      }

      .hud-judul {
        display: none;
      }

      .tumpuk {
        gap: 18vh;
        padding-block: 40vh;
      }

      .kartu {
        width: 100%;
      }
    }

    :host(.statis) .panggung {
      position: static;
      height: auto;
      overflow: visible;
    }

    :host(.statis) .kisi,
    :host(.statis) .benang,
    :host(.statis) .hud {
      display: none;
    }

    :host(.statis) .lapis {
      transform: none !important;
    }

    :host(.statis) .tumpuk {
      gap: 2.5rem;
      padding-block: 0;
      perspective: none;
    }

    :host(.statis) .kartu {
      width: 100%;
      opacity: 1 !important;
      transform: none !important;
    }

    :host(.statis) .tumpuk {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
      gap: 2rem 1.5rem;
    }

    @media (prefers-reduced-motion: reduce) {
      .bingkai img {
        transition: none;
      }
    }
  `,
})
export class JejakAlbum {
  readonly album = input.required<readonly AlbumSummary[]>();

  readonly bukaFoto = output<AlbumSummary>();

  private readonly dokumen = inject(DOCUMENT);
  private readonly pegang = inject(DestroyRef);

  private readonly rel = viewChild.required<ElementRef<HTMLElement>>('rel');
  private readonly lapis = viewChild.required<ElementRef<HTMLElement>>('lapis');
  private readonly benang = viewChild.required<ElementRef<SVGSVGElement>>('benang');
  private readonly jalur = viewChild.required<ElementRef<SVGPathElement>>('jalur');
  private readonly jejak = viewChild.required<ElementRef<SVGPathElement>>('jejak');
  private readonly ujung = viewChild.required<ElementRef<SVGCircleElement>>('ujung');
  private readonly tumpuk = viewChild.required<ElementRef<HTMLElement>>('tumpuk');
  private readonly kartu = viewChildren<ElementRef<HTMLElement>>('kartu');

  protected readonly nomorUrut = nomorUrut;
  protected readonly tanggalTeks = tanggalTeks;
  protected readonly sumberSampul = sumberSampul;
  protected readonly srcsetSampul = srcsetSampul;

  protected readonly statis = signal(gerakDikurangi());
  protected readonly aktif = signal(0);
  protected readonly jumlah = computed(() => this.album().length);
  protected readonly judulAktif = computed(() => this.album()[this.aktif()]?.title ?? '');

  protected readonly tinggiAwal = computed(() => `calc(${this.jumlah()} * 126svh + 60svh)`);

  private pusat: readonly number[] = [];
  private contoh: readonly Contoh[] = [];
  private panjang = 0;
  private halus = 0;
  private tujuan = 0;
  private kotor = true;
  private tampak = false;
  private siap = false;

  private hentikan: (() => void) | undefined;

  constructor() {
    effect(() => {
      this.album();
      requestAnimationFrame(() => this.hitung());
    });

    afterNextRender(() => {
      void this.pasang();
    });

    this.pegang.onDestroy(() => this.hentikan?.());
  }

  private async pasang(): Promise<void> {
    const jendela = this.dokumen.defaultView;

    if (jendela === null) {
      return;
    }

    if (this.jumlah() < 2) {
      this.statis.set(true);
      return;
    }

    const alat = await muatAlatGulir();

    if (alat === null) {
      this.statis.set(true);
      return;
    }

    const rel = this.rel().nativeElement;

    const hitungDariGulir = (): void => {
      const kotak = rel.getBoundingClientRect();
      const jarak = Math.max(kotak.height - jendela.innerHeight, 1);
      this.tujuan = Math.min(Math.max(-kotak.top / jarak, 0), 1);
      this.kotor = true;
    };

    const pemicu = alat.pemicu.create({
      trigger: rel,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self: { progress: number }) => {
        this.tujuan = self.progress;
        this.kotor = true;
      },
      onRefresh: hitungDariGulir,
    });

    hitungDariGulir();
    this.halus = this.tujuan;

    const langkah = (): void => {
      if (!this.tampak) {
        return;
      }

      const sisa = this.tujuan - this.halus;

      if (Math.abs(sisa) > 0.0001) {
        this.halus += sisa * LERAP;
        this.gambar();
        return;
      }

      if (this.kotor) {
        this.halus = this.tujuan;
        this.kotor = false;
        this.gambar();
      }
    };

    alat.gsap.ticker.add(langkah);

    let kunciUkuran = '';

    const segarkan = (): void => {
      requestAnimationFrame(() => {
        const lapis = this.lapis().nativeElement;
        const kunci = `${lapis.clientWidth}x${lapis.clientHeight}`;

        if (kunci === kunciUkuran) {
          return;
        }

        kunciUkuran = kunci;
        this.hitung();
        this.gambar();
      });
    };

    const pengamat = new ResizeObserver(segarkan);
    pengamat.observe(this.lapis().nativeElement);

    const penglihat = new IntersectionObserver((catatan) => {
      this.tampak = catatan.some((c) => c.isIntersecting);

      if (this.tampak) {
        hitungDariGulir();
      }
    });
    penglihat.observe(rel);

    this.siap = true;
    this.hitung();
    this.gambar();

    this.hentikan = () => {
      alat.gsap.ticker.remove(langkah);
      pengamat.disconnect();
      penglihat.disconnect();
      pemicu.kill();
      this.siap = false;
    };
  }

  private hitung(): void {
    if (!this.siap || this.statis()) {
      return;
    }

    const jendela = this.dokumen.defaultView;
    const rel = this.rel().nativeElement;
    const lapis = this.lapis().nativeElement;
    const benang = this.benang().nativeElement;
    const jalur = this.jalur().nativeElement;
    const jejak = this.jejak().nativeElement;

    if (jendela === null) {
      return;
    }

    const tinggi = lapis.offsetHeight;
    const lebar = lapis.offsetWidth;

    if (tinggi < 10 || lebar < 10) {
      return;
    }

    const awalTumpuk = this.tumpuk().nativeElement.offsetTop;
    const simpul = this.kartu().map((rujukan) => rujukan.nativeElement);

    this.pusat = simpul.map(
      (simpulKartu) => awalTumpuk + simpulKartu.offsetTop + simpulKartu.offsetHeight / 2,
    );

    benang.setAttribute('viewBox', `0 0 ${lebar} ${tinggi}`);

    const titik = this.pusat.map((_, i) => ({
      x: lebar / 2 + Math.sin(i * 1.15 + 0.4) * lebar * LIUK,
      y: this.pusat[i] ?? 0,
    }));

    if (titik.length === 0) {
      return;
    }

    const tengah = titik.reduce((jumlah, t) => jumlah + t.x, 0) / titik.length;
    const d = jalurLembut([{ x: tengah, y: 0 }, ...titik, { x: tengah, y: tinggi }]);

    jalur.setAttribute('d', d);
    jejak.setAttribute('d', d);

    this.panjang = jalur.getTotalLength();

    const langkahSampel = this.panjang / SAMPEL;

    this.contoh = Array.from({ length: SAMPEL + 1 }, (_, i) => {
      const l = Math.min(i * langkahSampel, this.panjang);
      const p = jalur.getPointAtLength(l);

      return { l, y: p.y };
    });

    const tambahan = (this.jumlah() * JARAK_GULIR * jendela.innerHeight) / 100;

    rel.style.height = `${Math.round(tinggi + tambahan + jendela.innerHeight)}px`;
    jejak.style.strokeDasharray = `${this.panjang}`;

    this.kotor = true;
  }

  private panjangSampai(y: number): number {
    const contoh = this.contoh;

    if (contoh.length === 0) {
      return 0;
    }

    const pertama = contoh[0] as Contoh;

    if (y <= pertama.y) {
      return 0;
    }

    for (let i = 1; i < contoh.length; i += 1) {
      const kini = contoh[i] as Contoh;
      const sebelum = contoh[i - 1] as Contoh;

      if (kini.y >= y) {
        const selisih = kini.y - sebelum.y;
        const bagian = selisih <= 0 ? 0 : (y - sebelum.y) / selisih;

        return sebelum.l + (kini.l - sebelum.l) * bagian;
      }
    }

    return this.panjang;
  }

  private gambar(): void {
    if (!this.siap || this.statis()) {
      return;
    }

    const jendela = this.dokumen.defaultView;
    const lapis = this.lapis().nativeElement;
    const jalur = this.jalur().nativeElement;
    const jejak = this.jejak().nativeElement;
    const ujung = this.ujung().nativeElement;

    if (jendela === null) {
      return;
    }

    const vh = jendela.innerHeight;
    const jarak = Math.max(lapis.offsetHeight - vh, 1);
    const geser = this.halus * jarak;
    const tengah = geser + vh / 2;

    lapis.style.transform = `translate3d(0, ${(-geser).toFixed(1)}px, 0)`;

    const simpul = this.kartu();
    let dekat = 0;
    let dekatJarak = Infinity;

    for (let i = 0; i < simpul.length; i += 1) {
      const elemen = simpul[i]?.nativeElement;

      if (elemen === undefined) {
        continue;
      }

      const jarakKartu = ((this.pusat[i] ?? 0) - tengah) / vh;
      const mutlak = Math.abs(jarakKartu);

      if (mutlak < dekatJarak) {
        dekatJarak = mutlak;
        dekat = i;
      }

      const kedekatan = Math.max(0, 1 - mutlak / PUDAR_JAUH);
      const skala = SKALA_JAUH + SKALA_DEKAT * kedekatan;
      const pudar = kedekatan ** 1.1;
      const putar = jarakKartu * -PUTAR_MAKS;
      const sisi = Math.max(-3, Math.min(3, jarakKartu)) * GESER_SISI;

      elemen.style.transform =
        `translate3d(${sisi.toFixed(1)}vw, 0, 0) rotateY(${putar.toFixed(2)}deg) scale(${skala.toFixed(3)})`;
      elemen.style.opacity = `${pudar.toFixed(3)}`;
    }

    if (dekat !== this.aktif()) {
      this.aktif.set(dekat);
    }

    const l = this.panjangSampai(tengah);
    const titik = jalur.getPointAtLength(l);

    jejak.style.strokeDashoffset = `${(this.panjang - l).toFixed(1)}`;
    ujung.setAttribute('cx', titik.x.toFixed(1));
    ujung.setAttribute('cy', titik.y.toFixed(1));
  }
}