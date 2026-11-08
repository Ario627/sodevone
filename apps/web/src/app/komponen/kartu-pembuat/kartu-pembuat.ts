import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild } from '@angular/core';
import { bolehBergerak } from '../../inti/gerak/media';
import type { Pembuat } from '../../inti/pembuat';

@Component({
  selector: 'kelas-kartu-pembuat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <article
      #kartu
      class="kartu"
      (pointermove)="sorot($event)"
      (pointerleave)="redup()"
    >
      <span class="cahaya" aria-hidden="true"></span>

      <header class="kepala">
        <span class="teks-piksel label">Kartu pembuat</span>
        <span class="teks-meta nomor">04</span>
      </header>

      <div class="tubuh">
        <h3 class="nama">{{ orang().nama }}</h3>
        <p class="teks-meta peran">{{ orang().peran }}</p>

        <p class="ringkas">{{ orang().ringkas }}</p>

        <dl class="rincian">
          <div>
            <dt class="teks-meta">Kelas</dt>
            <dd>{{ orang().kelas }}</dd>
          </div>
          <div>
            <dt class="teks-meta">Dipanggil</dt>
            <dd>{{ orang().panggilan }}</dd>
          </div>
        </dl>
      </div>

      <ol class="fokus">
        @for (butir of orang().fokus; track butir.judul; let i = $index) {
          <li>
            <span class="teks-meta urut">{{ (i + 1).toString().padStart(2, '0') }}</span>
            <span class="butir">{{ butir.judul }}</span>
            <span class="isi">{{ butir.isi }}</span>
          </li>
        }
      </ol>

      <footer class="kaki">
        <ul class="alat">
          @for (alat of orang().alat; track alat) {
            <li>{{ alat }}</li>
          }
        </ul>

        <p class="teks-piksel tanda">dibuat sendiri</p>
      </footer>
    </article>
  `,
  styles: `
    :host {
      display: block;
      perspective: 1400px;
    }

    .kartu {
      position: relative;
      display: grid;
      gap: clamp(1.4rem, 3vw, 2.2rem);
      padding: clamp(1.35rem, 3.4vw, 2.6rem);
      border: 1px solid var(--color-garis-halus);
      background-color: var(--color-latar-panel);
      overflow: hidden;
      isolation: isolate;
      transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
      transform-style: preserve-3d;
      transition:
        transform 420ms var(--ease-keluar),
        border-color 300ms var(--ease-keluar);
    }

    .kartu::before {
      content: '';
      position: absolute;
      inset: 0.5rem;
      border: 1px solid var(--color-garis-halus);
      pointer-events: none;
      opacity: 0.7;
    }

    .cahaya {
      position: absolute;
      inset: -30%;
      z-index: -1;
      background-image: radial-gradient(
        circle at var(--cx, 50%) var(--cy, 50%),
        color-mix(in oklab, var(--color-sinyal) 22%, transparent) 0%,
        transparent 42%
      );
      opacity: 0;
      transition: opacity 400ms var(--ease-keluar);
      pointer-events: none;
    }

    .kartu:hover .cahaya {
      opacity: 1;
    }

    .kepala,
    .kaki {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
    }

    .label {
      color: var(--color-sinyal);
      font-size: 0.6875rem;
    }

    .nomor,
    .peran {
      color: var(--color-teks-sekunder);
    }

    .tubuh {
      max-width: 46ch;
    }

    .nama {
      margin: 0;
      font-family: var(--font-serif);
      font-size: clamp(1.9rem, 5.4vw, 3rem);
      font-weight: 400;
      line-height: 0.98;
      letter-spacing: -0.035em;
      color: var(--color-teks-utama);
    }

    .peran {
      margin-block: 0.7rem 0;
    }

    .ringkas {
      margin-block: 1.15rem 0;
      font-size: 0.9375rem;
      line-height: 1.65;
      color: var(--color-teks-kuat-sekunder);
    }

    .rincian {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
      gap: 1px;
      margin-block: 1.5rem 0;
      border: 1px solid var(--color-garis-halus);
      background-color: var(--color-garis-halus);
    }

    .rincian > div {
      padding: 0.7rem 0.85rem;
      background-color: var(--color-latar-panel);
    }

    .rincian dd {
      margin-block: 0.25rem 0;
      font-size: 0.9375rem;
      color: var(--color-teks-utama);
    }

    .fokus {
      display: grid;
      gap: 0;
      margin: 0;
      padding: 0;
      list-style: none;
      border-block-start: 1px solid var(--color-garis-halus);
    }

    .fokus li {
      display: grid;
      grid-template-columns: 2rem minmax(0, 1fr);
      gap: 0.15rem 0.75rem;
      padding-block: 0.85rem;
      border-block-end: 1px solid var(--color-garis-halus);
    }

    .urut {
      grid-row: span 2;
      color: var(--color-garis-tegas);
    }

    .butir {
      font-family: var(--font-serif);
      font-size: 1.0625rem;
      line-height: 1.2;
      letter-spacing: -0.015em;
      color: var(--color-teks-utama);
    }

    .isi {
      font-size: 0.875rem;
      line-height: 1.55;
      color: var(--color-teks-sekunder);
    }

    .alat {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 0.9rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .alat li {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: var(--color-teks-sekunder);
    }

    .tanda {
      flex: none;
      font-size: 0.6875rem;
      color: var(--color-garis-tegas);
    }

    @media (prefers-reduced-motion: reduce) {
      .kartu,
      .cahaya {
        transition: none;
      }

      .kartu {
        transform: none;
      }
    }
  `,
})
export class KartuPembuat {
  readonly orang = input.required<Pembuat>();

  private readonly kartu = viewChild.required<ElementRef<HTMLElement>>('kartu');

  protected sorot(peristiwa: PointerEvent): void {
    const elemen = this.kartu().nativeElement;
    const kotak = elemen.getBoundingClientRect();
    const x = (peristiwa.clientX - kotak.left) / Math.max(kotak.width, 1);
    const y = (peristiwa.clientY - kotak.top) / Math.max(kotak.height, 1);

    elemen.style.setProperty('--cx', `${(x * 100).toFixed(1)}%`);
    elemen.style.setProperty('--cy', `${(y * 100).toFixed(1)}%`);

    if (!bolehBergerak()) {
      return;
    }

    elemen.style.setProperty('--ry', `${((x - 0.5) * 4.5).toFixed(2)}deg`);
    elemen.style.setProperty('--rx', `${((0.5 - y) * 4.5).toFixed(2)}deg`);
  }

  protected redup(): void {
    const elemen = this.kartu().nativeElement;

    elemen.style.removeProperty('--ry');
    elemen.style.removeProperty('--rx');
  }
}