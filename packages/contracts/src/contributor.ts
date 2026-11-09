import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common.js';
import { hasControlCharacter } from './query.js';

export const CONTRIBUTOR_FOCUS_MAX = 6;

export const CONTRIBUTOR_TOOL_MAX = 20;

export const CONTRIBUTOR_SUMMARY_MAX_LENGTH = 400;

export const CONTRIBUTOR_FOCUS_TITLE_MAX_LENGTH = 60;

export const CONTRIBUTOR_FOCUS_BODY_MAX_LENGTH = 240;

export const CONTRIBUTOR_TOOL_MAX_LENGTH = 40;

function plainText(max: number, label: string, min = 2) {
  return z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine(
      (value) => !hasControlCharacter(value),
      `${label} memuat karakter yang tidak diizinkan`,
    );
}

export const ContributorFocusSchema = z.strictObject({
  title: plainText(CONTRIBUTOR_FOCUS_TITLE_MAX_LENGTH, 'Judul fokus'),
  body: plainText(CONTRIBUTOR_FOCUS_BODY_MAX_LENGTH, 'Isi fokus'),
});

export type ContributorFocus = z.infer<typeof ContributorFocusSchema>;

export const ContributorToolSchema = plainText(CONTRIBUTOR_TOOL_MAX_LENGTH, 'Nama alat');

export const ContributorFieldsSchema = z.strictObject({
  name: plainText(80, 'Nama'),
  nickname: plainText(32, 'Nama panggilan'),
  role: plainText(80, 'Peran'),
  className: plainText(40, 'Kelas'),
  summary: plainText(CONTRIBUTOR_SUMMARY_MAX_LENGTH, 'Ringkasan', 10),
  focuses: z.array(ContributorFocusSchema).max(CONTRIBUTOR_FOCUS_MAX),
  tools: z.array(ContributorToolSchema).max(CONTRIBUTOR_TOOL_MAX),
  isPublished: z.boolean(),
});

export type ContributorFields = z.infer<typeof ContributorFieldsSchema>;

export const ContributorInputSchema = ContributorFieldsSchema;

export type ContributorInput = z.infer<typeof ContributorInputSchema>;

export const ContributorSchema = z.object({
  id: UuidSchema,
  name: plainText(80, 'Nama'),
  nickname: plainText(32, 'Nama panggilan'),
  role: plainText(80, 'Peran'),
  className: plainText(40, 'Kelas'),
  summary: plainText(CONTRIBUTOR_SUMMARY_MAX_LENGTH, 'Ringkasan', 10),
  focuses: z.array(ContributorFocusSchema).max(CONTRIBUTOR_FOCUS_MAX),
  tools: z.array(ContributorToolSchema).max(CONTRIBUTOR_TOOL_MAX),
});

export type Contributor = z.infer<typeof ContributorSchema>;

export const ContributorAdminSchema = ContributorSchema.extend({
  isPublished: z.boolean(),
  updatedAt: IsoDateTimeSchema,
});

export type ContributorAdmin = z.infer<typeof ContributorAdminSchema>;