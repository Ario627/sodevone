import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'kelas-kepala-bagian',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex items-baseline justify-between gap-4">
      <h2 [id]="judulId()" class="flex min-w-0 items-baseline gap-2.5">
        <span aria-hidden="true" class="teks-meta shrink-0 text-sinyal">{{ nomor() }}</span>
        <span class="teks-meta text-balance text-teks-kuat-sekunder">{{ judul() }}</span>
      </h2>

      <span aria-hidden="true" class="mb-[0.35em] hidden h-px flex-1 bg-garis-halus sm:block"></span>

      @if (jumlah(); as nilai) {
        <span class="teks-meta hidden shrink-0 text-teks-sekunder sm:inline">{{ nilai }}</span>
      }

      @if (tautan(); as tujuan) {
        <a
          [routerLink]="tujuan"
          class="teks-meta inline-flex min-h-11 shrink-0 items-center text-teks-sekunder transition-colors duration-100 ease-keluar hover:text-sinyal"
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
  readonly jumlah = input<string>();
  readonly tautan = input<string>();
  readonly labelTautan = input('Semua');
}
