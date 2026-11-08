import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TINGGI_GLYPH, lebarTeks, titikTeks } from '../../inti/piksel/glyph';

@Component({
  selector: 'kelas-angka-piksel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex align-middle' },
  template: `
    <svg
      [attr.viewBox]="kotakPandang()"
      [style.height.px]="tinggi()"
      [style.width.px]="lebar()"
      fill="currentColor"
      shape-rendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      @for (t of titik(); track t.kolom + ':' + t.baris) {
        <rect [attr.x]="t.kolom" [attr.y]="t.baris" width="1" height="1" />
      }
    </svg>
    <span class="sr-only">{{ teks() }}</span>
  `,
})
export class AngkaPiksel {
  readonly teks = input.required<string>();
  readonly tinggi = input(14);

  protected readonly titik = computed(() => titikTeks(this.teks()));
  protected readonly kotakPandang = computed(() => `0 0 ${lebarTeks(this.teks())} ${TINGGI_GLYPH}`);
  protected readonly lebar = computed(() => (this.tinggi() * lebarTeks(this.teks())) / TINGGI_GLYPH);
}