import {
  MemberAdminListSchema,
  type ClassMember,
  type MemberAdmin,
  type MemberAdminList,
  type MemberInput,
} from '@kelas/contracts';
import { DASAR_API, type Permintaan } from './dasar';

const ANGGOTA = `${DASAR_API}/admin/members`;

export interface BarisAnggota extends MemberInput {
  readonly kunci: string;
}

export function bacaRoster(nilai: unknown): MemberAdminList {
  return MemberAdminListSchema.parse(nilai);
}

export function permintaanRoster(): Permintaan {
  return { url: ANGGOTA };
}

export function alamatRoster(): string {
  return ANGGOTA;
}

export function dariAdmin(daftar: readonly MemberAdmin[]): BarisAnggota[] {
  return daftar.map((item) => ({
    kunci: item.id,
    role: item.role,
    fullName: item.fullName,
    nickname: item.nickname,
    hobby: item.hobby,
    note: item.note,
    isPublished: item.isPublished,
  }));
}

export function dariServer(daftar: readonly ClassMember[]): BarisAnggota[] {
  return daftar.map((item) => ({
    kunci: item.id,
    role: item.role,
    fullName: item.fullName,
    nickname: item.nickname,
    hobby: item.hobby,
    note: item.note,
    isPublished: true,
  }));
}

export function barisBaru(urut: number): BarisAnggota {
  return {
    kunci: `baru-${urut}-${Math.random().toString(36).slice(2, 8)}`,
    role: 'student',
    fullName: '',
    nickname: '',
    hobby: '',
    note: '',
    isPublished: false,
  };
}

export function keMasukan(daftar: readonly BarisAnggota[]): MemberInput[] {
  return daftar.map(({ kunci, ...sisa }) => {
    void kunci;

    return sisa;
  });
}

export type { MemberAdmin, MemberAdminList };