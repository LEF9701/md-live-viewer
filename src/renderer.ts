/**
 * Markdown → HTML renderer. Pure (no vscode import) so it can be unit-tested.
 * Every top-level-ish block element gets a `data-line` attribute with its
 * 0-based source line, which the preview uses for scroll sync and
 * double-click-to-source.
 */
import MarkdownIt from 'markdown-it';
import texmath from 'markdown-it-texmath';
import katex from 'katex';
import hljs from 'highlight.js';
import taskLists from 'markdown-it-task-lists';
import footnote from 'markdown-it-footnote';

export interface RenderOptions {
  math: boolean;
  mermaid: boolean;
  /** Map a raw image src to a URL the webview can load. */
  resolveResource?: (src: string) => string;
}

const BLOCK_SELF_CLOSING = new Set(['fence', 'code_block', 'hr', 'math_block', 'math_block_eqno']);

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

export function createRenderer(opts: RenderOptions): (src: string) => string {
  const md = new MarkdownIt({ html: true, linkify: true, typographer: false, breaks: false });

  if (opts.math) {
    md.use(texmath, {
      engine: katex,
      delimiters: 'dollars',
      katexOptions: { throwOnError: false, output: 'htmlAndMathml' },
    });
  }
  md.use(taskLists, { enabled: false, label: true });
  md.use(footnote);

  // ── source line + heading id attributes ─────────────────────────────
  md.core.ruler.push('source_lines', (state) => {
    const used = new Map<string, number>();
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.map && (t.nesting === 1 || BLOCK_SELF_CLOSING.has(t.type))) {
        t.attrSet('data-line', String(t.map[0]));
      }
      if (t.type === 'heading_open') {
        const inline = tokens[i + 1];
        let slug = slugify(inline?.content ?? '') || 'section';
        const n = used.get(slug) ?? 0;
        used.set(slug, n + 1);
        if (n > 0) slug = `${slug}-${n}`;
        t.attrSet('id', slug);
      }
    }
    return true;
  });

  // ── fenced code: Mermaid diagrams + syntax highlighting ─────────────
  const esc = md.utils.escapeHtml;
  md.renderer.rules.fence = (tokens, idx) => {
    const t = tokens[idx];
    const line = t.attrGet('data-line') ?? '';
    const lang = (t.info || '').trim().split(/\s+/)[0].toLowerCase();
    if (opts.mermaid && lang === 'mermaid') {
      return `<div class="mermaid-block" data-line="${line}"><pre class="mermaid-src">${esc(t.content)}</pre></div>\n`;
    }
    let body: string;
    if (lang && hljs.getLanguage(lang)) {
      try {
        body = hljs.highlight(t.content, { language: lang, ignoreIllegals: true }).value;
      } catch {
        body = esc(t.content);
      }
    } else {
      body = esc(t.content);
    }
    const cls = lang ? ` class="hljs language-${esc(lang)}"` : ' class="hljs"';
    return `<pre data-line="${line}"><code${cls}>${body}</code></pre>\n`;
  };
  md.renderer.rules.code_block = (tokens, idx) => {
    const t = tokens[idx];
    return `<pre data-line="${t.attrGet('data-line') ?? ''}"><code class="hljs">${esc(t.content)}</code></pre>\n`;
  };

  // ── images: rewrite local paths to webview URIs ─────────────────────
  const defaultImage = md.renderer.rules.image!;
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const t = tokens[idx];
    const src = t.attrGet('src');
    if (src && opts.resolveResource) t.attrSet('src', opts.resolveResource(String(src)));
    return defaultImage(tokens, idx, options, env, self);
  };

  return (src: string) => md.render(src);
}

export interface OutlineItem {
  level: number;
  text: string;
  line: number;
}

export interface DocStats {
  words: number;
  lines: number;
  headings: number;
  diagrams: number;
  codeBlocks: number;
  images: number;
  readingMinutes: number;
}

const plainMd = new MarkdownIt({ html: true });
const CJK = /[぀-ヿ㐀-䶿一-鿿가-힯豈-﫿]/g;

/** Headings, document statistics — used by the sidebar dashboard. */
export function analyze(src: string): { outline: OutlineItem[]; stats: DocStats } {
  const tokens = plainMd.parse(src, {});
  const outline: OutlineItem[] = [];
  let diagrams = 0;
  let codeBlocks = 0;
  let images = 0;
  let prose = '';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'heading_open' && t.map) {
      const text = (tokens[i + 1]?.children ?? [])
        .filter((c) => c.type === 'text' || c.type === 'code_inline')
        .map((c) => c.content)
        .join('');
      outline.push({ level: Number(t.tag.slice(1)), text: text || tokens[i + 1]?.content || '', line: t.map[0] });
    } else if (t.type === 'fence') {
      if (t.info.trim().toLowerCase().startsWith('mermaid')) diagrams++;
      else codeBlocks++;
    } else if (t.type === 'code_block') {
      codeBlocks++;
    } else if (t.type === 'inline') {
      prose += ' ' + t.content;
      images += (t.children ?? []).filter((c) => c.type === 'image').length;
    }
  }
  const cjk = (prose.match(CJK) ?? []).length;
  const latin = prose.replace(CJK, ' ').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const words = latin + cjk;
  return {
    outline,
    stats: {
      words,
      lines: src.length ? src.split(/\r?\n/).length : 0,
      headings: outline.length,
      diagrams,
      codeBlocks,
      images,
      readingMinutes: Math.max(words ? 1 : 0, Math.round(latin / 230 + cjk / 500)),
    },
  };
}

/** True when a src/href points somewhere other than the local file system. */
export function isRemote(src: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(src) || /^(data|mailto|vscode-webview|https?):/i.test(src);
}
