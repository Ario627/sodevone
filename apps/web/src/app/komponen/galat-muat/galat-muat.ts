import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'kelas-galat-muat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div role="alert" class="border-y border-garis-halus py-10">
      <p class="font-serif text-lg tracking-[-0.01em]">Konten gagal dimuat</p>
      <p class="mt-2 max-w-[48ch] text-sm text-teks-sekunder">{{ pesan() }}</p>
      @if (korelasi(); as kode) {
        <p class="teks-meta mt-3 text-teks-sekunder">Kode {{ kode }}</p>
      }
      <button
        type="button"
        (click)="cobaLagi.emit()"
        class="mt-5 inline-flex min-h-11 items-center border-b border-garis-tegas text-sm transition-colors duration-100 ease-keluar hover:border-sinyal hover:text-sinyal cursor-pointer"
      >
        Coba lagi
      </button>
    </div>
  `,
})
export class GalatMuat {
  readonly pesan = input.required<string>();
  readonly korelasi = input<string>();
  readonly cobaLagi = output<void>();
}