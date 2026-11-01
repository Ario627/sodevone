import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { hariBulan } from '../../inti/format/tanggal';

@Component({
  selector: 'kelas-stempel-tanggal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <time [attr.datetime]="nilai()" class="flex flex-col items-start gap-1">
      <span class="font-mono text-[1.375rem] leading-none tracking-[-0.04em] tabular-nums">
        {{ bagian().hari }}
      </span>
      <span class="teks-meta whitespace-nowrap text-teks-sekunder">{{ keterangan() }}</span>
    </time>
  `,
})
export class StempelTanggal {
    readonly nilai = input.required<string>();
    readonly tahun = input(false);

    protected readonly bagian = computed(() => hariBulan(this.nilai()))

    protected readonly keterangan = computed(() => {
        const bagian = this.bagian();


        return this.tahun() ? `${bagian.bulan} ${bagian.tahun}` : bagian.bulan;
    })
}