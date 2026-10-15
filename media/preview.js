// Webview side of Markdown Live Viewer.
// Receives rendered HTML from the extension and swaps it in without reloading,
// renders Mermaid diagrams (with a cache so typing doesn't flicker), handles
// the theme toggle, scroll sync and double-click-to-source.
(function () {
  'use strict';
  const vscode = acquireVsCodeApi();
  const content = document.getElementById('content');
  const btnTheme = document.getElementById('btn-theme');
  const customCss = document.getElementById('custom-css');

  let mode = 'auto'; // user setting: auto | light | dark
  let effective = null; // light | dark actually shown
  let mermaidOn = true;
  let currentUri = null;
  let gen = 0;
  let idSeq = 0;
  const svgCache = new Map(); // `${theme}\n${src}` -> svg

  const ICONS = {
    light:
      '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.2"/><g stroke-linecap="round"><path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3 3l1.1 1.1M11.9 11.9 13 13M3 13l1.1-1.1M11.9 4.1 13 3"/></g></svg>',
    dark: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1z"/></svg>',
    auto: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.6"/><path d="M8 2.4v11.2a5.6 5.6 0 0 0 0-11.2z" class="fill"/></svg>',
  };
  const NEXT = { auto: 'light', light: 'dark', dark: 'auto' };
  const LABEL = { auto: 'Auto (follows VS Code)', light: 'Light', dark: 'Dark' };

  // ── theme ─────────────────────────────────────────────────────────
  function vscodeIsDark() {
    const c = document.body.classList;
    if (c.contains('vscode-light') || c.contains('vscode-high-contrast-light')) return false;
    return c.contains('vscode-dark') || c.contains('vscode-high-contrast');
  }

  function applyTheme() {
    const eff = mode === 'auto' ? (vscodeIsDark() ? 'dark' : 'light') : mode;
    document.documentElement.dataset.theme = eff;
    btnTheme.innerHTML = ICONS[mode] + '<span>' + mode + '</span>';
    btnTheme.title = 'Theme: ' + LABEL[mode] + ' — click for ' + LABEL[NEXT[mode]];
    if (eff !== effective) {
      const changed = effective !== null;
      effective = eff;
      initMermaid();
      if (changed) renderMermaid();
    }
  }

  btnTheme.addEventListener('click', () => {
    mode = NEXT[mode];
    applyTheme(); // instant feedback; extension persists the setting
    vscode.postMessage({ type: 'setTheme', mode });
  });

  // VS Code swaps body classes when the editor theme changes.
  new MutationObserver(() => mode === 'auto' && applyTheme()).observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
  });

  // ── mermaid ───────────────────────────────────────────────────────
  function initMermaid() {
    if (!window.mermaid) return;
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: effective === 'dark' ? 'dark' : 'default',
      fontFamily: 'inherit',
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  }

  function outFor(block) {
    let out = block.querySelector(':scope > .mermaid-out');
    if (!out) {
      out = document.createElement('div');
      out.className = 'mermaid-out';
      block.appendChild(out);
    }
    return out;
  }

  async function renderMermaid() {
    if (!window.mermaid || !mermaidOn) return;
    const my = ++gen;
    const blocks = Array.from(content.querySelectorAll('.mermaid-block'));
    for (const block of blocks) {
      const src = block.querySelector('.mermaid-src').textContent;
      const out = outFor(block);
      const key = effective + '\n' + src;
      const cached = svgCache.get(key);
      if (cached) {
        out.innerHTML = cached;
        block.classList.remove('stale', 'has-error');
        continue;
      }
      const id = 'mmd-' + ++idSeq;
      try {
        const { svg } = await window.mermaid.render(id, src);
        if (my !== gen) return;
        svgCache.set(key, svg);
        if (svgCache.size > 60) svgCache.delete(svgCache.keys().next().value);
        out.innerHTML = svg;
        block.classList.remove('stale', 'has-error');
        block.querySelector(':scope > .mermaid-error')?.remove();
      } catch (err) {
        document.getElementById('d' + id)?.remove(); // mermaid's leftover node
        document.getElementById(id)?.remove();
        if (my !== gen) return;
        // Keep the last good diagram (dimmed) and show the error under it.
        block.classList.add('has-error');
        let box = block.querySelector(':scope > .mermaid-error');
        if (!box) {
          box = document.createElement('div');
          box.className = 'mermaid-error';
          block.appendChild(box);
        }
        const msg = (err && (err.message || err.str)) || String(err);
        box.innerHTML = '<strong>Mermaid</strong> ' + escapeHtml(msg.split('\n').slice(0, 4).join('\n'));
      }
    }
  }

  // ── scroll sync ───────────────────────────────────────────────────
  function lineElements() {
    return Array.from(content.querySelectorAll('[data-line]')).filter((e) => e.getClientRects().length > 0);
  }

  function scrollToLine(line) {
    const els = lineElements();
    let prev = null;
    let next = null;
    for (const el of els) {
      const l = Number(el.dataset.line);
      if (l <= line) prev = { el, l };
      else {
        next = { el, l };
        break;
      }
    }
    if (!prev) {
      window.scrollTo(0, 0);
      return;
    }
    const top = (e) => e.getBoundingClientRect().top + window.scrollY;
    let y = top(prev.el);
    if (next && next.l > prev.l) y += (top(next.el) - y) * ((line - prev.l) / (next.l - prev.l));
    window.scrollTo(0, Math.max(0, y - 12));
  }

  // Double-click anywhere → jump to that source line (SyncTeX-style).
  content.addEventListener('dblclick', (e) => {
    const el = e.target.closest('[data-line]');
    if (!el) return;
    let line = Number(el.dataset.line);
    // Refine inside multi-line paragraphs by vertical position.
    const nextEl = lineElements().find((x) => Number(x.dataset.line) > line && !el.contains(x));
    if (nextEl && !el.querySelector('[data-line]')) {
      const span = Number(nextEl.dataset.line) - line;
      const r = el.getBoundingClientRect();
      if (span > 1 && r.height > 0) line += Math.max(0, Math.min(span - 1, Math.floor(((e.clientY - r.top) / r.height) * span)));
    }
    vscode.postMessage({ type: 'reveal', line });
  });

  // Links: anchors scroll in place, everything else goes to the extension.
  content.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    e.preventDefault();
    if (href.startsWith('#')) {
      const target = document.getElementById(decodeURIComponent(href.slice(1)));
      if (target) target.scrollIntoView({ block: 'start' });
    } else {
      vscode.postMessage({ type: 'link', href });
    }
  });

  // ── messages from the extension ───────────────────────────────────
  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'update') {
      mode = msg.theme;
      mermaidOn = msg.mermaid;
      document.documentElement.style.setProperty('--font-size', msg.fontSize + 'px');
      if (customCss.textContent !== msg.customCss) customCss.textContent = msg.customCss;

      const sameDoc = msg.uri === currentUri;
      const previous = Array.from(content.querySelectorAll('.mermaid-block > .mermaid-out')).map((o) => o.innerHTML);
      const y = window.scrollY;

      content.innerHTML = msg.html;

      // Pre-fill diagrams with the previous render so typing never flashes empty.
      Array.from(content.querySelectorAll('.mermaid-block')).forEach((block, i) => {
        if (sameDoc && previous[i]) {
          outFor(block).innerHTML = previous[i];
          block.classList.add('stale');
        }
      });

      applyTheme();
      renderMermaid();

      if (sameDoc) window.scrollTo(0, y);
      else if (typeof msg.line === 'number') scrollToLine(msg.line);
      else window.scrollTo(0, 0);

      currentUri = msg.uri;
      vscode.setState({ uri: msg.uri });
    } else if (msg.type === 'scrollTo') {
      scrollToLine(msg.line);
    }
  });

  applyTheme();
  vscode.postMessage({ type: 'ready' });
})();
