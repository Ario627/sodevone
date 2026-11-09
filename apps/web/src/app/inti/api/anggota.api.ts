import { MemberCollectionSchema, type ClassMember, type MemberCollection } from '@kelas/contracts';
import { DASAR_API, type Permintaan } from './dasar';

const ANGGOTA = `${DASAR_API}/public/members`;

export type AnggotaServer = ClassMember;

export function bacaKoleksiAnggota(nilai: unknown): MemberCollection {
  return MemberCollectionSchema.parse(nilai);
}

export function permintaanAnggota(): Permintaan {
  return { url: ANGGOTA };
}