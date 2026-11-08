import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  input,
} from '@angular/core';
import { bolehBergerak } from './media';

const AMBANG = 0.12;
const CADANGAN_MS = 6000;

@Directive({ selector: '[kelasMuncul]' })
export class Muncul {
  readonly tunda = input(0, {
    alias: 'kelasMuncul',
    transform: (nilai: unknown) => Number(nilai) || 0,
  });

  private readonly elemen = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly pegang = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const simpul = this.elemen.nativeElement;
      if (!bolehBergerak() || typeof IntersectionObserver === 'undefined') {
        return;
      }

      let selesai = false;
      let cadangan = 0;
      let penglihat: IntersectionObserver | undefined;

      const tampilkan = (): void => {
        if (selesai) {
          return;
        }
        selesai = true;
        const tunda = Number(this.tunda()) || 0;
        simpul.style.transitionDelay = tunda > 0 ? `${tunda}ms` : '';
        simpul.classList.remove('kelas-tersembunyi');
        simpul.classList.add('kelas-muncul');
        clearTimeout(cadangan);
        penglihat?.disconnect();
      };

      const lihat = new IntersectionObserver(
        (catatan) => {
          if (catatan.some((c) => c.isIntersecting)) {
            tampilkan();
          }
        },
        { threshold: AMBANG, rootMargin: '0px 0px -8% 0px' },
      );
      penglihat = lihat;

      simpul.classList.add('kelas-tersembunyi');
      lihat.observe(simpul);
      cadangan = setTimeout(tampilkan, CADANGAN_MS);

      this.pegang.onDestroy(() => {
        clearTimeout(cadangan);
        lihat.disconnect();
      });
    });
  }
}