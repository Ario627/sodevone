import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Catatan {
  private readonly terbukaSinyal = signal(false);

  readonly terbuka = this.terbukaSinyal.asReadonly();

  buka(): void {
    this.terbukaSinyal.set(true);
  }

  tutup(): void {
    this.terbukaSinyal.set(false);
  }
}