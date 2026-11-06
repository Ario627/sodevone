import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type { SessionUser } from '@kelas/contracts';
import { firstValueFrom } from 'rxjs';
import { bacaSesi, KELUAR, MASUK, SESI } from '../api/auth.api';

export type StatusSesi = 'belum' | 'memuat' | 'masuk' | 'keluar';

@Injectable({ providedIn: 'root' })
export class Sesi {
  private readonly http = inject(HttpClient);

  private readonly statusSinyal = signal<StatusSesi>('belum');

  private readonly penggunaSinyal = signal<SessionUser | null>(null);

  private muatBerjalan: Promise<boolean> | undefined;

  readonly pengguna = this.penggunaSinyal.asReadonly();

  readonly masuk = computed(() => this.penggunaSinyal() !== null);

  readonly peran = computed(() => this.penggunaSinyal()?.role);

  async muat(): Promise<boolean> {
    if (this.statusSinyal() === 'masuk') {
      return true;
    }

    if (this.muatBerjalan !== undefined) {
      return this.muatBerjalan;
    }

    this.statusSinyal.set('memuat');
    this.muatBerjalan = this.ambilSesi();
    const hasil = await this.muatBerjalan;
    this.muatBerjalan = undefined;

    return hasil;
  }

  async masukDengan(username: string, password: string): Promise<void> {
    const mentah = await firstValueFrom(this.http.post(MASUK, { username, password }));

    this.penggunaSinyal.set(bacaSesi(mentah).user);
    this.statusSinyal.set('masuk');
  }

  async keluar(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(KELUAR, {}));
    } catch (galat) {
      if (!(galat instanceof HttpErrorResponse)) {
        throw galat;
      }
    } finally {
      this.penggunaSinyal.set(null);
      this.statusSinyal.set('keluar');
    }
  }

  private async ambilSesi(): Promise<boolean> {
    try {
      const mentah = await firstValueFrom(this.http.get(SESI));

      this.penggunaSinyal.set(bacaSesi(mentah).user);
      this.statusSinyal.set('masuk');

      return true;
    } catch (galat) {
      if (!(galat instanceof HttpErrorResponse)) {
        throw galat;
      }

      this.penggunaSinyal.set(null);
      this.statusSinyal.set('keluar');

      return false;
    }
  }
}