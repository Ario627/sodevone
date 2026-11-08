import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { Catatan } from '../../inti/gerak/catatan';

@Component({
  selector: 'kelas-catatan-situs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      (click)="buka()"
      class="teks-meta inline-flex min-h-11 items-center text-teks-kuat-sekunder underline decoration-garis-tegas decoration-1 underline-offset-[6px] transition-colors duration-100 ease-keluar hover:text-sinyal"
    >
      {{ label() }}
    </button>

    <dialog
      #dialog
      aria-labelledby="catatan-judul"
      (close)="tutup()"
      (cancel)="tutup()"
      (keydown.escape)="tutup()"
      (click)="klikLatar($event)"
      class="m-auto w-[min(34rem,calc(100vw-2rem))] border border-garis-halus bg-latar-panel p-0 text-teks-utama backdrop:bg-teks-utama/45"
    >
      <div class="p-6 sm:p-7">
        <div class="flex items-baseline justify-between gap-4">
          <p class="teks-meta bertanda text-sinyal">Catatan</p>
          <button
            type="button"
            (click)="tutup()"
            class="teks-meta inline-flex min-h-11 items-center text-teks-sekunder hover:text-sinyal"
          >
            Tutup
          </button>
        </div>

        <h2 id="catatan-judul" class="mt-4 font-serif text-2xl leading-tight tracking-[-0.03em]">
          Tentang situs ini
        </h2>

        <div class="prosa mt-4 text-sm">
          <p>
            Situs resmi Kelas XI PPLG 1, jurusan Pengembangan Perangkat Lunak dan Gim. Isinya
            pengumuman, agenda kegiatan, dan dokumentasi yang sudah disetujui untuk dipublikasikan.
          </p>
          <p>
            Konten dikelola pengurus kelas melalui panel administrasi. Nama dan kontak pribadi
            pengurus tidak dipublikasikan di sini.
          </p>
          <p>
            PPLG adalah jurusan yang mempelajari rekayasa perangkat lunak sekaligus pengembangan
            gim. Karena itu situs ini memakai bahasa visual kisi piksel dan lembar kontak, bukan
            gaya korporat.
          </p>
        </div>
      </div>
    </dialog>
  `,
})
export class CatatanSitus {
  private readonly catatan = inject(Catatan);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly label = input('Tentang situs ini');

  constructor() {
    effect(() => {
      const terbuka = this.catatan.terbuka();

      const dialog = this.dialog().nativeElement;

      if (terbuka && !dialog.open) {
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
      }

      if (!terbuka && dialog.open) {
        dialog.close();
      }
    });
  }

  protected buka(): void {
    this.catatan.buka();
  }

  protected tutup(): void {
    this.catatan.tutup();
  }

  protected klikLatar(peristiwa: MouseEvent): void {
    if (peristiwa.target === this.dialog().nativeElement) {
      this.catatan.tutup();
    }
  }
}