import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common.js';
import { hasControlCharacter } from './query.js';

export const MEMBER_ROLES = ['student', 'homeroom'] as const;

export const MEMBER_MAX = 60;

export const MEMBER_NAME_MAX_LENGTH = 80;

export const MEMBER_NICKNAME_MAX_LENGTH = 32;

export const MEMBER_HOBBY_MAX_LENGTH = 48;

export const MEMBER_NOTE_MAX_LENGTH = 200;

export const MemberRoleSchema = z.enum(MEMBER_ROLES);

export type MemberRole = z.infer<typeof MemberRoleSchema>;

function plainText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max)
    .refine(
      (value) => !hasControlCharacter(value),
      `${label} memuat karakter yang tidak diizinkan`,
    );
}

type MemberCompleteness = {
  isPublished: boolean;
  fullName: string;
  nickname: string;
  hobby: string;
  note: string;
};

function completeWhenPublished(value: MemberCompleteness): boolean {
  if (!value.isPublished) {
    return true;
  }

  return [value.fullName, value.nickname, value.hobby, value.note].every(
    (field) => field.length >= 2,
  );
}

export const MemberNameSchema = plainText(MEMBER_NAME_MAX_LENGTH, 'Nama');

export const MemberNicknameSchema = plainText(MEMBER_NICKNAME_MAX_LENGTH, 'Nama panggilan');

export const MemberHobbySchema = plainText(MEMBER_HOBBY_MAX_LENGTH, 'Hobi');

export const MemberNoteSchema = plainText(MEMBER_NOTE_MAX_LENGTH, 'Catatan');

export const ClassMemberSchema = z.object({
  id: UuidSchema,
  order: z.number().int().min(1).max(MEMBER_MAX),
  role: MemberRoleSchema,
  fullName: MemberNameSchema,
  nickname: MemberNicknameSchema,
  hobby: MemberHobbySchema,
  note: MemberNoteSchema,
});

export type ClassMember = z.infer<typeof ClassMemberSchema>;

export const MemberCollectionSchema = z.object({
  items: z.array(ClassMemberSchema).max(MEMBER_MAX),
});

export type MemberCollection = z.infer<typeof MemberCollectionSchema>;

export const MemberAdminSchema = ClassMemberSchema.extend({
  isPublished: z.boolean(),
  updatedAt: IsoDateTimeSchema,
});

export type MemberAdmin = z.infer<typeof MemberAdminSchema>;

export const MemberAdminListSchema = z.object({
  items: z.array(MemberAdminSchema).max(MEMBER_MAX),
});

export type MemberAdminList = z.infer<typeof MemberAdminListSchema>;

export const MemberInputSchema = z
  .strictObject({
    role: MemberRoleSchema,
    fullName: MemberNameSchema,
    nickname: MemberNicknameSchema,
    hobby: MemberHobbySchema,
    note: MemberNoteSchema,
    isPublished: z.boolean(),
  })
  .refine(completeWhenPublished, {
    message: 'Anggota yang ditampilkan harus punya nama, panggilan, hobi, dan catatan',
    path: ['isPublished'],
  });

export type MemberInput = z.infer<typeof MemberInputSchema>;

export const MemberRosterSchema = z
  .strictObject({
    items: z.array(MemberInputSchema).max(MEMBER_MAX),
  })
  .refine(
    (value) => value.items.filter((item) => item.role === 'homeroom').length <= 1,
    'Hanya boleh ada satu wali kelas',
  );

export type MemberRoster = z.infer<typeof MemberRosterSchema>;
