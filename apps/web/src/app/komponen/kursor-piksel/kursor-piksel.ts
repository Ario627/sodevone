import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { bolehBergerak } from '../../inti/gerak/media';

const LERAP = 0.22;

const AMBANG_DIAM = 0.4;

const SKALA_INTERAKTIF = '1.7';

const TARGET_INTERAKTIF = 'a, button, [role="button"], summary, input, select, textarea';

@Component({
  selector: 'kelas-kursor-piksel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'pointer-events-none fixed inset-0 z-40 block' },
  template: `
    <div
      #bidik
      class="absolute top-0 left-0 scale-100 opacity-0 transition-[opacity,scale] duration-200 ease-keluar"
    >
      <span class="absolute -top-3 -left-3 h-2.5 w-2.5 border-t border-l border-sinyal"></span>
      <span class="absolute -top-3 -right-3 h-2.5 w-2.5 border-t border-r border-sinyal"></span>
      <span class="absolute -bottom-3 -left-3 h-2.5 w-2.5 border-b border-l border-sinyal"></span>
      <span class="absolute -right-3 -bottom-3 h-2.5 w-2.5 border-r border-b border-sinyal"></span>
      <span class="absolute -top-px -left-px h-0.5 w-0.5 bg-sinyal" aria-hidden="true"></span>
    </div>
  `,
})
export class KursorPiksel implements AfterViewInit {
  private readonly bidik = viewChild.required<ElementRef<HTMLDivElement>>('bidik');

  private readonly destroyRef = inject(DestroyRef);

  private posisiX = 0;

  private posisiY = 0;

  private targetX = 0;

  private targetY = 0;

  private terlihat = false;

  private berjalan = false;

  private bingkai = 0;

  private lepas: (() => void)[] = [];

  ngAfterViewInit(): void {
    if (!bolehBergerak()) {
      return;
    }

    const gerak = (peristiwa: PointerEvent) => this.ajukan(peristiwa);

    const masuk = () => this.tampilkan(true);

    const keluar = () => this.tampilkan(false);

    globalThis.addEventListener('pointermove', gerak, { passive: true });
    document.addEventListener('pointerleave', keluar);
    document.addEventListener('pointerenter', masuk);

    this.lepas.push(() => {
      globalThis.removeEventListener('pointermove', gerak);
      document.removeEventListener('pointerleave', keluar);
      document.removeEventListener('pointerenter', masuk);
    });

    this.destroyRef.onDestroy(() => this.bersihkan());
  }

  private periksaSasaran(): void {
    const sasaran = document.elementFromPoint(this.posisiX, this.posisiY);

    const interaktif = sasaran !== null && sasaran.closest(TARGET_INTERAKTIF) !== null;

    const elemen = this.bidik().nativeElement;

    const skala = interaktif ? SKALA_INTERAKTIF : '1';

    if (elemen.style.scale !== skala) {
      elemen.style.scale = skala;
    }
  }

  private tampilkan(nilai: boolean): void {
    this.terlihat = nilai;

    this.bidik().nativeElement.style.opacity = nilai ? '1' : '0';
  }

  private ajukan(peristiwa: PointerEvent): void {
    if (!this.terlihat) {
      this.posisiX = peristiwa.clientX;
      this.posisiY = peristiwa.clientY;
      this.tampilkan(true);
    }

    this.targetX = peristiwa.clientX;
    this.targetY = peristiwa.clientY;

    if (!this.berjalan) {
      this.berjalan = true;
      this.bingkai = requestAnimationFrame(this.langkah);
    }
  }

  private langkah = (): void => {
    const selisihX = this.targetX - this.posisiX;

    const selisihY = this.targetY - this.posisiY;

    this.posisiX += selisihX * LERAP;
    this.posisiY += selisihY * LERAP;

    this.bidik().nativeElement.style.transform = `translate3d(${this.posisiX.toFixed(2)}px, ${this.posisiY.toFixed(2)}px, 0)`;

    this.periksaSasaran();

    if (Math.abs(selisihX) < AMBANG_DIAM && Math.abs(selisihY) < AMBANG_DIAM) {
      this.berjalan = false;

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