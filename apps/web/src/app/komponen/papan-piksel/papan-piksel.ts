import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { bolehBergerak, pantauMedia, warnaToken } from '../../inti/gerak/media';

const JARAK_LEBAR = 26;

const JARAK_SEMPIT = 22;

const AMBANG_SEMPIT = 640;

const RADIUS = 170;

const DPR_MAKS = 2;

const PELURUHAN = 0.9;

const AMBANG_BERHENTI = 0.015;

const TITIK_MAKS = 4;

const ALFA_STATIS = 0.5;

@Component({
  selector: 'kelas-papan-piksel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pointer-events-none fixed inset-0 -z-10 block', 'aria-hidden': 'true' },
  template: `<canvas #kanvas class="h-full w-full"></canvas>`,
})
export class PapanPiksel implements AfterViewInit {
  private readonly kanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('kanvas');

  private readonly destroyRef = inject(DestroyRef);

  private konteks: CanvasRenderingContext2D | undefined;

  private statis: HTMLCanvasElement | undefined;

  private lebar = 0;

  private tinggi = 0;

  private dpr = 1;

  private jarak = JARAK_LEBAR;

  private posisiX = -9999;

  private posisiY = -9999;

  private kekuatan = 0;

  private berjalan = false;

  private bingkai = 0;

  private bisa = false;

  private warnaGaris = '#c9c5ba';

  private warnaSinyal = '#a4441f';

  private lepas: (() => void)[] = [];

  ngAfterViewInit(): void {
    const kanvas = this.kanvas().nativeElement;

    this.konteks = kanvas.getContext('2d') ?? undefined;

    if (this.konteks === undefined) {
      return;
    }

    this.bisa = bolehBergerak();
    this.bacaWarna();
    this.ukur();

    const ubahUkuran = () => this.ukur();

    globalThis.addEventListener('resize', ubahUkuran, { passive: true });

    this.lepas.push(() => globalThis.removeEventListener('resize', ubahUkuran));

    this.lepas.push(
      pantauMedia('(prefers-color-scheme: dark)', () => {
        this.bacaWarna();
        this.ukur();
      }),
    );

    if (this.bisa) {
      const gerak = (peristiwa: PointerEvent) => this.ajukan(peristiwa);

      globalThis.addEventListener('pointermove', gerak, { passive: true });

      this.lepas.push(() => globalThis.removeEventListener('pointermove', gerak));
    }

    this.destroyRef.onDestroy(() => this.bersihkan());
  }

  private bacaWarna(): void {
    this.warnaGaris = warnaToken('--color-garis-tegas', '#c9c5ba');
    this.warnaSinyal = warnaToken('--color-sinyal', '#a4441f');
  }

  private ukur(): void {
    const kanvas = this.kanvas().nativeElement;

    const kotak = kanvas.getBoundingClientRect();

    this.dpr = Math.min(globalThis.devicePixelRatio || 1, DPR_MAKS);
    this.lebar = Math.max(1, Math.round(kotak.width));
    this.tinggi = Math.max(1, Math.round(kotak.height));
    this.jarak = this.lebar < AMBANG_SEMPIT ? JARAK_SEMPIT : JARAK_LEBAR;

    kanvas.width = Math.round(this.lebar * this.dpr);
    kanvas.height = Math.round(this.tinggi * this.dpr);

    this.statis = this.buatStatis();

    this.gambarBingkai();
  }

  private buatStatis(): HTMLCanvasElement {
    const lapis = document.createElement('canvas');

    lapis.width = Math.round(this.lebar * this.dpr);
    lapis.height = Math.round(this.tinggi * this.dpr);

    const konteks = lapis.getContext('2d');

    if (konteks === null) {
      return lapis;
    }

    konteks.scale(this.dpr, this.dpr);
    konteks.fillStyle = this.warnaGaris;
    konteks.globalAlpha = ALFA_STATIS;

    for (let y = this.jarak / 2; y < this.tinggi; y += this.jarak) {
      for (let x = this.jarak / 2; x < this.lebar; x += this.jarak) {
        konteks.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }

    return lapis;
  }

  private gambarBingkai(): void {
    const konteks = this.konteks;

    const kanvas = this.kanvas().nativeElement;

    if (konteks === undefined) {
      return;
    }

    konteks.setTransform(1, 0, 0, 1, 0, 0);
    konteks.clearRect(0, 0, kanvas.width, kanvas.height);

    if (this.statis !== undefined) {
      konteks.drawImage(this.statis, 0, 0);
    }

    if (this.kekuatan <= 0) {
      return;
    }

    konteks.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    konteks.fillStyle = this.warnaSinyal;

    const mulaiX = Math.max(
      this.jarak / 2,
      Math.floor((this.posisiX - RADIUS) / this.jarak) * this.jarak,
    );

    const selesaiX = Math.min(this.lebar, this.posisiX + RADIUS);

    const mulaiY = Math.max(
      this.jarak / 2,
      Math.floor((this.posisiY - RADIUS) / this.jarak) * this.jarak,
    );

    const selesaiY = Math.min(this.tinggi, this.posisiY + RADIUS);

    for (let y = mulaiY; y <= selesaiY; y += this.jarak) {
      for (let x = mulaiX; x <= selesaiX; x += this.jarak) {
        const selisihX = x - this.posisiX;

        const selisihY = y - this.posisiY;

        const kuadrat = selisihX * selisihX + selisihY * selisihY;

        if (kuadrat > RADIUS * RADIUS) {
          continue;
        }

        const dekat = 1 - Math.sqrt(kuadrat) / RADIUS;

        const ukuran = 1 + Math.round(dekat * (TITIK_MAKS - 1) * this.kekuatan);

        konteks.globalAlpha = Math.min(1, dekat * this.kekuatan * 1.2);

        konteks.fillRect(Math.round(x - ukuran / 2), Math.round(y - ukuran / 2), ukuran, ukuran);
      }
    }

    konteks.globalAlpha = 1;
  }

  private ajukan(peristiwa: PointerEvent): void {
    this.posisiX = peristiwa.clientX;
    this.posisiY = peristiwa.clientY;
    this.kekuatan = 1;

    if (!this.berjalan) {
      this.berjalan = true;
      this.bingkai = requestAnimationFrame(this.langkah);
    }
  }

  private langkah = (): void => {
    if (!this.berjalan) {
      return;
    }

    this.kekuatan *= PELURUHAN;
    this.gambarBingkai();

    if (this.kekuatan < AMBANG_BERHENTI) {
      this.kekuatan = 0;
      this.berjalan = false;
      this.gambarBingkai();

      return;
    }

    this.bingkai = requestAnimationFrame(this.langkah);
  };

  private bersihkan(): void {
    cancelAnimationFrame(this.bingkai);

    for (const lepas of this.lepas) {
      lepas();
    }

    this.lepas = [];
    this.berjalan = false;
  }
}