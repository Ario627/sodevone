import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'kelas-kepala-bagian',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex items-baseline justify-between gap-6">
      <h2 [id]="judulId()" class="flex items-baseline gap-3">
        <span aria-hidden="true" class="teks-meta text-sinyal">{{ nomor() }}</span>
        <span class="teks-meta text-teks-kuat-sekunder">{{ judul() }}</span>
      </h2>

      @if (tautan(); as tujuan) {
        <a
          [routerLink]="tujuan"
          class="teks-meta shrink-0 text-teks-sekunder transition-colors duration-100 ease-keluar hover:text-sinyal"
        >
          {{ labelTautan() }} <span aria-hidden="true">&rarr;</span>
        </a>
      }
    </div>
  `,
})
export class KepalaBagian {
  readonly nomor = input.required<string>();
  readonly judul = input.required<string>();
  readonly judulId = input<string>();
  readonly tautan = input<string>();
  readonly labelTautan = input('Semua');
}