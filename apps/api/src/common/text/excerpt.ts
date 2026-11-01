const MAX_EXCERPT_LENGTH = 200;

const FENCE = /```[\s\S]*?```/g;

const INLINE_CODE = /`([^`]*)`/g;

const IMAGE = /!\[([^\]]*)\]\([^)]*\)/g;

const LINK = /\[([^\]]*)\]\([^)]*\)/g;

const HTML_TAG = /<[^>]*>/g;

const LINE_MARKER = /^[\s>#*+-]+/gm;

const EMPHASIS = /[*_~]/g;

const WHITESPACE = /\s+/g;

const TRAILING_PUNCTUATION = /[\s,;:.\-–—]+$/u;

const ELLIPSIS = '…';

function cutAtWord(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }

  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  const head = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;

  return `${head.replace(TRAILING_PUNCTUATION, '')}${ELLIPSIS}`;
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(FENCE, ' ')
    .replace(IMAGE, ' ')
    .replace(LINK, '$1')
    .replace(INLINE_CODE, '$1')
    .replace(HTML_TAG, ' ')
    .replace(LINE_MARKER, '')
    .replace(EMPHASIS, '')
    .replace(WHITESPACE, ' ')
    .trim();
}

export function excerptFromMarkdown(markdown: string): string {
  return cutAtWord(stripMarkdown(markdown), MAX_EXCERPT_LENGTH);
}