import type { ClassMember, MemberAdmin } from '@kelas/contracts';
import { toIsoInstant } from '../common/text/instant.js';
import type { ClassMemberRow } from '../db/schema/class-member.js';

const FIRST_ORDER = 1;

function orderOf(row: ClassMemberRow): number {
  return row.sortOrder + FIRST_ORDER;
}

export function toClassMember(row: ClassMemberRow): ClassMember {
  return {
    id: row.id,
    order: orderOf(row),
    role: row.role as ClassMember['role'],
    fullName: row.fullName,
    nickname: row.nickname,
    hobby: row.hobby,
    note: row.note,
  };
}

export function toMemberCollection(rows: ClassMemberRow[]): ClassMember[] {
  return rows.map(toClassMember);
}

export function toMemberAdmin(row: ClassMemberRow): MemberAdmin {
  return {
    ...toClassMember(row),
    isPublished: row.isPublished,
    updatedAt: toIsoInstant(row.updatedAt),
  };
}

export function toMemberAdminList(rows: ClassMemberRow[]): MemberAdmin[] {
  return rows.map(toMemberAdmin);
}
