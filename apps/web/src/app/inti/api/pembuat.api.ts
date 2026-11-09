import { ContributorSchema, type Contributor } from '@kelas/contracts';
import { DASAR_API, type Permintaan } from './dasar';

const PEMBUAT = `${DASAR_API}/public/contributor`;

export type PembuatServer = Contributor;

export function bacaPembuat(nilai: unknown): Contributor {
  return ContributorSchema.parse(nilai);
}

export function permintaanPembuat(): Permintaan {
  return { url: PEMBUAT };
}