const MAX_TERMS = 6;

const MAX_TERM_LENGTH = 40;

const WHITESPACE = /\s+/;

const NON_WORD_CHARACTER = /[^\p{L}\p{N}_-]/gu;

const EDGE_DASH = /^-+|-+$/g;

export function searchTermsOf(raw: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];

  for (const token of raw.split(WHITESPACE)) {
    const cleaned = token.replace(NON_WORD_CHARACTER, '').replace(EDGE_DASH, '');

    if (cleaned.length === 0 || cleaned.length > MAX_TERM_LENGTH) {
      continue;
    }

    const key = cleaned.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    terms.push(cleaned);

    if (terms.length === MAX_TERMS) {
      break;
    }
  }

  return terms;
}

export function wordBoundaryPatternOf(term: string): string {
  return `\\m${term}\\M`;
}
