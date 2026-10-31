import { z } from 'zod';

const PAGE_MIN = 1;

const PAGE_MAX = 1000;

export function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }

  return false;
}

function normalizePage(value: unknown): number {
  if (typeof value !== 'string' || !/^[0-9]{1,4}$/.test(value)) {
    return PAGE_MIN;
  }

  const parsed = Number.parseInt(value, 10);

  return Math.min(Math.max(parsed, PAGE_MIN), PAGE_MAX);
}

export const PageParamSchema = z.unknown().optional().transform(normalizePage);

export const PerPagePublicSchema = z.coerce.number().int().min(1).max(50).default(10);

export const PerPageAdminSchema = z.coerce.number().int().min(1).max(100).default(20);

export const BooleanQuerySchema = z.stringbool();

export const SearchQuerySchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .refine(
    (value) => !hasControlCharacter(value),
    'Kata kunci memuat karakter yang tidak diizinkan',
  );

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
