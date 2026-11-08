import { ChangeDetectionStrategy, Component, DestroyRef, DOCUMENT, inject, signal } from '@angular/core';

@Component({
  selector: 'kelas-garis-gulir',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'pointer-events-none fixed inset-x-0 top-0 z-50 block h-[3px]',
    'aria-hidden': 'true',
  },
  styles: `
    :host {
      background-color: transparent;
    }

    .isi {
      display: block;
      block-size: 100%;
      inline-size: 100%;
      background-image: repeating-linear-gradient(
        90deg,
        var(--color-sinyal) 0 3px,
        transparent 3px 6px
      );
      will-change: clip-path;
    }

    @media (prefers-color-scheme: dark) {
      .isi {
        opacity: 0.85;
      }
    }
  `,
  template: `<span class="isi" [style.clip-path]="potongan()"></span>`,
})
export class GarisGulir {
  private readonly dokumen = inject(DOCUMENT);
  private readonly pegang = inject(DestroyRef);
  private readonly progres = signal(0);

  protected readonly potongan = () => {
    const sisa = Math.max(100 - this.progres() * 100, 0);
    return `inset(0 ${sisa}% 0 0)`;
  };

  private bingkai = 0;

  constructor() {
    const jendela = this.dokumen.defaultView;
    if (!jendela) {
      return;
    }

    const hitung = (): void => {
      this.bingkai = 0;
      const atas = jendela.scrollY;
      const tinggi = this.dokumen.documentElement.scrollHeight - jendela.innerHeight;
      this.progres.set(tinggi <= 0 ? 0 : Math.min(Math.max(atas / tinggi, 0), 1));
    };

    const minta = (): void => {
      if (!this.bingkai) {
        this.bingkai = jendela.requestAnimationFrame(hitung);
      }
    };

    jendela.addEventListener('scroll', minta, { passive: true });
    jendela.addEventListener('resize', minta, { passive: true });
    hitung();

    this.pegang.onDestroy(() => {
      jendela.removeEventListener('scroll', minta);
      jendela.removeEventListener('resize', minta);
      if (this.bingkai) {
        jendela.cancelAnimationFrame(this.bingkai);
      }
    });
  }
}