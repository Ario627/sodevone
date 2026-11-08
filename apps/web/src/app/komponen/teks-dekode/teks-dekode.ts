import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  linkedSignal,
  viewChild,
} from '@angular/core';
import { bingkaiDekode, progresDekode } from '../../inti/gerak/dekode';
import { gerakDikurangi } from '../../inti/gerak/media';

const DURASI = 520;

@Component({
  selector: 'kelas-teks-dekode',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline' },
  template: `
    <span #visual aria-hidden="true">{{ tampil() }}</span>
    <span class="sr-only">{{ teks() }}</span>
  `,
})
export class TeksDekode implements AfterViewInit {
  readonly teks = input.required<string>();

  private readonly visual = viewChild.required<ElementRef<HTMLElement>>('visual');

  private readonly destroyRef = inject(DestroyRef);

  protected readonly tampil = linkedSignal(() => this.teks());

  private dijalankan = false;

  private bingkai = 0;

  ngAfterViewInit(): void {
    if (gerakDikurangi() || globalThis.IntersectionObserver === undefined) {
      return;
    }

    const pengamat = new IntersectionObserver((catatan) => {
      const terlihat = catatan.some((butir) => butir.isIntersecting);

      if (!terlihat || this.dijalankan) {
        return;
      }

      pengamat.disconnect();
      this.mulai();
    });

    pengamat.observe(this.visual().nativeElement);

    this.destroyRef.onDestroy(() => {
      pengamat.disconnect();
      cancelAnimationFrame(this.bingkai);
    });
  }

  private mulai(): void {
    this.dijalankan = true;

    const teks = this.teks();

    const mulai = performance.now();

    const langkah = () => {
      const progres = progresDekode(performance.now() - mulai, DURASI);

      this.tampil.set(bingkaiDekode(teks, progres, Math.random));

      if (progres >= 1) {
        this.tampil.set(teks);

        return;
      }

      this.bingkai = requestAnimationFrame(langkah);
    };

    this.bingkai = requestAnimationFrame(langkah);
  }
}