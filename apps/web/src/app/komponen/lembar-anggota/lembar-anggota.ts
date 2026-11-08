import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { nomorUrut } from '../../inti/format/label';
import type { Anggota } from '../../inti/kelas/anggota';
import { AngkaPiksel } from '../angka-piksel/angka-piksel';

@Component({
  selector: 'kelas-lembar-anggota',
  imports: [AngkaPiksel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      aria-labelledby="anggota-judul"
      (close)="tutupLembar.emit()"
      (cancel)="tutupLembar.emit()"
      (click)="klikLatar($event)"
      class="m-auto w-[min(28rem,calc(100vw-2rem))] border border-garis-halus bg-latar-panel p-0 text-teks-utama backdrop:bg-teks-utama/45"
    >
      @if (anggota(); as orang) {
        <div class="p-6 sm:p-7">
          <div class="flex items-start justify-between gap-4">
            <span class="text-sinyal" aria-hidden="true">
              <kelas-angka-piksel [teks]="nomorUrut(orang.urut)" [tinggi]="15" />
            </span>
            <button
              type="button"
              (click)="tutupLembar.emit()"
              class="teks-meta -mt-2 inline-flex min-h-11 items-center text-teks-sekunder transition-colors duration-100 ease-keluar hover:text-sinyal"
            >
              Tutup
            </button>
          </div>

          <h2
            id="anggota-judul"
            class="mt-1 font-serif text-[1.75rem] leading-[1.05] tracking-[-0.03em]"
          >
            {{ orang.nama }}
          </h2>

          <p class="teks-meta mt-2 text-teks-sekunder">{{ orang.panggilan }}</p>

          <dl class="mt-6 border-t border-garis-halus">
            <div class="flex items-baseline gap-3 border-b border-garis-halus py-3">
              <dt class="teks-meta shrink-0 text-teks-sekunder">Hobi</dt>
              <span aria-hidden="true" class="pengarah-titik"></span>
              <dd class="min-w-0 text-right text-sm text-teks-kuat-sekunder">
                {{ orang.hobi }}
              </dd>
            </div>
            <div class="border-b border-garis-halus py-3">
              <dt class="teks-meta text-teks-sekunder">Catatan</dt>
              <dd class="mt-1.5 text-sm leading-relaxed text-teks-kuat-sekunder">
                {{ orang.catatan }}
              </dd>
            </div>
          </dl>
        </div>
      }
    </dialog>
  `,
})
export class LembarAnggota {
  readonly anggota = input<Anggota | null>(null);

  readonly tutupLembar = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly nomorUrut = nomorUrut;

  constructor() {
    effect(() => {
      const orang = this.anggota();
      const dialog = this.dialog().nativeElement;

      if (orang !== null && !dialog.open) {
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
      }

      if (orang === null && dialog.open) {
        dialog.close();
      }
    });
  }

  protected klikLatar(peristiwa: MouseEvent): void {
    if (peristiwa.target === this.dialog().nativeElement) {
      this.tutupLembar.emit();
    }
  }
}