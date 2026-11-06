import { HomeResponseSchema, type HomeResponse } from '@kelas/contracts';
import { DASAR_API, type Permintaan } from './dasar';

const BERANDA = `${DASAR_API}/public/home`;

export function bacaBeranda(nilai: unknown): HomeResponse {
  return HomeResponseSchema.parse(nilai);
}

export function permintaanBeranda(): Permintaan {
  return { url: BERANDA };
}
