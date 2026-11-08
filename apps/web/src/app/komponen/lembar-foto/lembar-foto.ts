import { ChangeDetectionStrategy, Component, ElementRef, effect, input, output, viewChild } from "@angular/core";
import { RouterLink } from "@angular/router";
import type { AlbumSummary } from "@kelas/contracts";
import { sumberFoto, srcsetFoto } from "../../inti/api/galeri.api";
import { tanggalTeks } from "../../inti/format/tanggal";


@Component({
  selector: 'kelas-lembar-foto',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      aria-labelledby="foto-judul"
      (close)="tutupLembar.emit()"
      (cancel)="tutupLembar.emit()"
      (click)="klikLatar($event)"
      class="m-auto w-[min(46rem,calc(100vw-1.5rem))] border border-garis-halus bg-latar-panel p-0 text-teks-utama backdrop:bg-teks-utama/60"
    >
      @if (album(); as isi) {
        <div class="flex items-start justify-between gap-4 px-4 pt-3 pb-2 sm:px-5">
          <div class="min-w-0">
            <p class="teks-meta text-teks-sekunder">
              {{ tanggalTeks(isi.eventDate) }} &middot; {{ isi.imageCount }} foto
            </p>
            <h2
              id="foto-judul"
              class="mt-1 font-serif text-lg leading-tight tracking-[-0.02em] sm:text-xl"
            >
              {{ isi.title }}
            </h2>
          </div>

          <button
            type="button"
            (click)="tutupLembar.emit()"
            class="teks-meta -mt-1 inline-flex min-h-11 shrink-0 items-center text-teks-sekunder transition-colors duration-100 ease-keluar hover:text-sinyal"
          >
            Tutup
          </button>
        </div>

        <div class="bg-latar-sekunder">
          @if (isi.cover; as sampul) {
            <img
              [src]="sumberFoto(sampul.id, 'sedang')"
              [attr.srcset]="srcsetFoto(sampul.id)"
              sizes="(min-width: 46rem) 44rem, 100vw"
              [attr.width]="sampul.width"
              [attr.height]="sampul.height"
              [attr.alt]="sampul.altText ?? isi.title"
              decoding="async"
              class="mx-auto block h-auto max-h-[68svh] w-auto max-w-full object-contain"
            />
          } @else {
            <p class="teks-meta px-5 py-16 text-center text-teks-sekunder">Tanpa sampul</p>
          }
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
          @if (isi.description; as keterangan) {
            <p class="max-w-[46ch] text-sm leading-relaxed text-teks-kuat-sekunder">
              {{ keterangan }}
            </p>
          } @else {
            <span></span>
          }

          <a
            [routerLink]="['/galeri', isi.slug]"
            (click)="tutupLembar.emit()"
            class="teks-meta inline-flex min-h-11 items-center text-teks-kuat-sekunder transition-colors duration-100 ease-keluar hover:text-sinyal"
          >
            Buka album <span aria-hidden="true" class="ml-1">&rarr;</span>
          </a>
        </div>
      }
    </dialog>
  `,
})
export class LembarFoto {
    readonly album = input<AlbumSummary | null>(null);

    readonly tutupLembar = output<void>();

    private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

    protected readonly sumberFoto = sumberFoto;
    protected readonly srcsetFoto = srcsetFoto;
    protected readonly tanggalTeks = tanggalTeks;

    constructor() {
        effect(() => {
            const isi = this.album();
            const dialog = this.dialog().nativeElement;

            if(isi !== null && !dialog.open) {
                if(typeof dialog.showModal === 'function') {
                    dialog.showModal();
                } else {
                    dialog.setAttribute('open', '');
                }
            }

            if(isi === null && dialog.open) {
                dialog.close();
            }
        })
    }


    protected klikLatar(peristiwa: MouseEvent): void {
        if(peristiwa.target === this.dialog().nativeElement) {
            this.tutupLembar.emit();
        }
    }
}