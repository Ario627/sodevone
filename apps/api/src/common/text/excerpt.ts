const MAX_EXCERPT_LENGTH = 200;

const MIN_PROSE_LENGTH = 40;

const ELLIPSIS = '…';

const FENCE = /```[\s\S]*?```/g;

const IMAGE = /!\[[^\]]*\]\([^)]*\)/g;

const LINK = /\[([^\]]*)\]\([^)]*\)/g;

const INLINE_CODE = /`([^`]*)`/g;

const HTML_TAG = /<[^>]*>/g;

const EMPHASIS = /[*_~]/g;

const WHITESPACE = /\s+/g;

const BLOCK_BREAK = /\n{2,}/;

const LINE_BREAK = /\n/;

const HEADING_PREFIX = /^#{1,6}\s*/;

const LIST_PREFIX = /^(?:[-*+]|\d{1,3}[.)])\s+/;

const QUOTE_PREFIX = /^>\s?/;

const THEMATIC_BREAK = /^(?:[-*_]\s*){3,}$/;

const TRAILING_PUNCTUATION = /[\s,;:.\-–—]+$/u;

const TERMINAL_PUNCTUATION = /[.!?…:;]$/u;

const ITEM_SEPARATOR = ', ';

const SENTENCE_SEPARATOR = '. ';

type BlockKind = 'heading' | 'list' | 'quote' | 'paragraph';

type Block = { kind: BlockKind; text: string };

function cutAtWord(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }

  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  const head = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;

  return `${head.replace(TRAILING_PUNCTUATION, '')}${ELLIPSIS}`;
}

function cleanInline(text: string): string {
  return text
    .replace(IMAGE, ' ')
    .replace(LINK, '$1')
    .replace(INLINE_CODE, '$1')
    .replace(HTML_TAG, ' ')
    .replace(EMPHASIS, '')
    .replace(WHITESPACE, ' ')
    .trim();
}

function linesOf(block: string): string[] {
  return block
    .split(LINE_BREAK)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function blockOf(raw: string): Block | undefined {
  const lines = linesOf(raw);

  const first = lines[0];

  if (first === undefined || THEMATIC_BREAK.test(first)) {
    return undefined;
  }

  if (HEADING_PREFIX.test(first)) {
    const text = cleanInline(lines.map((line) => line.replace(HEADING_PREFIX, '')).join(' '));

    return text.length === 0 ? undefined : { kind: 'heading', text };
  }

  if (LIST_PREFIX.test(first)) {
    const text = cleanInline(
      lines.map((line) => line.replace(LIST_PREFIX, '')).join(ITEM_SEPARATOR),
    );

    return text.length === 0 ? undefined : { kind: 'list', text };
  }

  if (QUOTE_PREFIX.test(first)) {
    const text = cleanInline(lines.map((line) => line.replace(QUOTE_PREFIX, '')).join(' '));

    return text.length === 0 ? undefined : { kind: 'quote', text };
  }

  const text = cleanInline(lines.join(' '));

  return text.length === 0 ? undefined : { kind: 'paragraph', text };
}

function blocksOf(markdown: string): Block[] {
  return markdown
    .replace(FENCE, ' ')
    .split(BLOCK_BREAK)
    .flatMap((raw) => {
      const block = blockOf(raw);

      return block === undefined ? [] : [block];
    });
}

function textsOf(blocks: readonly Block[], kinds: readonly BlockKind[]): string[] {
  return blocks.filter((block) => kinds.includes(block.kind)).map((block) => block.text);
}

function joinSentences(pieces: readonly string[]): string {
  let result = '';

  for (const piece of pieces) {
    if (result.length === 0) {
      result = piece;
      continue;
    }

    result = TERMINAL_PUNCTUATION.test(result)
      ? `${result} ${piece}`
      : `${result}${SENTENCE_SEPARATOR}${piece}`;
  }

  return result;
}

export function excerptFromMarkdown(markdown: string): string {
  const blocks = blocksOf(markdown);

  const prose = joinSentences(textsOf(blocks, ['paragraph', 'quote']));

  if (prose.length >= MIN_PROSE_LENGTH) {
    return cutAtWord(prose, MAX_EXCERPT_LENGTH);
  }

  const withItems = joinSentences(
    [prose, ...textsOf(blocks, ['list'])].filter((text) => text.length > 0),
  );

  if (withItems.length > 0) {
    return cutAtWord(withItems, MAX_EXCERPT_LENGTH);
  }

  return cutAtWord(joinSentences(textsOf(blocks, ['heading'])), MAX_EXCERPT_LENGTH);
}
