import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
const BARIS_MAKSIMUM = 6;

@Component({
  selector: 'kelas-memuat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div role="status" class="border-t border-garis-halus">
      <span class="sr-only">{{ pesan() }}</span>
      <div aria-hidden="true">
        @for (baris of barisSemu(); track baris) {
          <div class="border-b border-garis-halus py-6">
            <div class="h-2 w-16 rounded-xs bg-latar-sekunder"></div>
            <div class="mt-3 h-3.5 w-3/5 rounded-xs bg-latar-sekunder"></div>
            <div class="mt-2.5 h-2.5 w-full rounded-xs bg-latar-sekunder"></div>
          </div>
        }
      </div>
    </div>
  `,
})
export class Memuat {
    readonly pesan = input("Memuat konten...");
    readonly jumlah = input(4);

    protected readonly barisSemu = computed(() => {
        const batas = Math.min(Math.max(this.jumlah(), 1), BARIS_MAKSIMUM);
        const hasil: number[] = [];

        for(let i = 0; i < batas; i++) {
            hasil.push(i);
        }
        
        return hasil;
    })
}