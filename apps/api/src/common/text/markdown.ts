import MarkdownIt from 'markdown-it';
import type { RendererRule, Token } from 'markdown-it';

const HEADING_MIN = 2;

const HEADING_MAX = 3;

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

const URL_BASE = 'https://kelas.invalid';

const HEADING_TAG = /^h[1-6]$/;

const EXTERNAL_HREF = /^https?:/i;

const md = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false,
  breaks: false,
});

function isAllowedLink(url: string): boolean {
  if (url.startsWith('//')) {
    return false;
  }

  try {
    return ALLOWED_PROTOCOLS.has(new URL(url, URL_BASE).protocol);
  } catch {
    return false;
  }
}

const renderImageAsText: RendererRule = (tokens, index) => {
  const raw = tokens[index]?.content;
  const label = typeof raw === 'string' ? raw.trim() : '';

  return md.utils.escapeHtml(label.length > 0 ? `[gambar: ${label}]` : '[gambar]');
};

const renderLinkOpen: RendererRule = (tokens, index, options, _env, renderer) => {
  const token = tokens[index];

  if (token === undefined) {
    return '';
  }

  const raw = token.attrGet('href');
  const href = typeof raw === 'string' ? raw : '';

  if (!isAllowedLink(href)) {
    token.attrSet('href', '');
  } else if (EXTERNAL_HREF.test(href)) {
    token.attrSet('rel', 'noopener noreferrer');
    token.attrSet('target', '_blank');
    token.attrSet('referrerpolicy', 'no-referrer');
    token.attrSet('class', 'tautan-luar');
  }

  return renderer.renderToken(tokens, index, options);
};

function shiftHeadings(tokens: Token[]): void {
  const levels = tokens
    .filter((token) => token.type === 'heading_open' && HEADING_TAG.test(token.tag))
    .map((token) => Number.parseInt(token.tag.slice(1), 10));

  if (levels.length === 0) {
    return;
  }

  const offset = HEADING_MIN - Math.min(...levels);

  for (const token of tokens) {
    if (token.type !== 'heading_open' && token.type !== 'heading_close') {
      continue;
    }

    const level = Number.parseInt(token.tag.slice(1), 10);

    token.tag = `h${Math.min(Math.max(level + offset, HEADING_MIN), HEADING_MAX)}`;
  }
}

md.validateLink = isAllowedLink;

md.renderer.rules['image'] = renderImageAsText;

md.renderer.rules['link_open'] = renderLinkOpen;

export function renderAnnouncementBody(markdown: string): string {
  const tokens = md.parse(markdown, {});

  shiftHeadings(tokens);

  return md.renderer.render(tokens, md.options, {});
}