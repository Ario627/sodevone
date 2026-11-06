import { ChangeDetectionStrategy, Component } from "@angular/core";
import { tanggalPanjangTeks, tahunAjaran } from "../../inti/format/tanggal";

@Component({
  selector: 'kelas-pita-edisi',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block border-b border-garis-halus bg-latar-sekunder' },
  template: `
    <div
      class="mx-auto flex max-w-[76rem] flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-1.5 sm:px-8"
    >
      <p class="teks-meta text-teks-kuat-sekunder">{{ edisi }}</p>
      <p class="teks-meta text-teks-sekunder">{{ tanggal }}</p>
    </div>
  `,
})
export class PitaEdisi {
    private readonly sekarang = new Date();
    protected readonly edisi = `Edisi ${tahunAjaran(this.sekarang)}`;
    protected readonly tanggal = tanggalPanjangTeks(this.sekarang.toISOString());
}