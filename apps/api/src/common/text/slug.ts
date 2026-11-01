const MAX_SLUG_LENGTH = 120;

const FALLBACK_SLUG = 'pengumuman';

const COMBINING_MARKS = /[\u0300-\u036f]/g;

const NON_ALPHANUMERIC = /[^a-z0-9]+/g;

const EDGE_DASH = /^-+|-+$/g;

export function slugify(value: string, maxLength = MAX_SLUG_LENGTH): string {
  const ascii = value.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
  const trimmed = ascii
    .replace(NON_ALPHANUMERIC, '-')
    .slice(0, maxLength)
    .replace(EDGE_DASH, '');

  return trimmed.length === 0 ? FALLBACK_SLUG : trimmed;
}

export function slugVariant(base: string, index: number): string {
  const suffix = `-${index}`;
  const head = base.slice(0, MAX_SLUG_LENGTH - suffix.length).replace(EDGE_DASH, '');

  return `${head}${suffix}`;
}