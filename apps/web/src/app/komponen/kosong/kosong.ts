import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'kelas-kosong',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="border-y border-garis-halus py-10">
      <p class="font-serif text-lg tracking-[-0.01em]">{{ judul() }}</p>
      <p class="mt-2 max-w-[48ch] text-sm text-teks-sekunder">{{ pesan() }}</p>
      @if (tautan(); as tujuan) {
        <a
          [routerLink]="tujuan"
          class="mt-5 inline-flex min-h-11 items-center border-b border-garis-tegas text-sm transition-colors duration-100 ease-keluar hover:border-sinyal hover:text-sinyal"
        >
          {{ labelTautan() }}
        </a>
      }
    </div>
  `,
})
export class Kosong {
  readonly judul = input('Belum ada isi');
  readonly pesan = input.required<string>();
  readonly tautan = input<string>();
  readonly labelTautan = input('Lihat halaman lain');
}