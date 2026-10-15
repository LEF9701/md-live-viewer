// Sidebar dashboard for Markdown Live Viewer.
(function () {
  'use strict';
  const vscode = acquireVsCodeApi();
  const app = document.getElementById('app');
  const saved = vscode.getState() || { open: {}, filter: '' };
  let state = null;

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const send = (msg) => vscode.postMessage(msg);
  const persist = () => vscode.setState(saved);

  const ICON = {
    eye: '<svg viewBox="0 0 16 16"><path d="M1 8s2.6-4.5 7-4.5S15 8 15 8s-2.6 4.5-7 4.5S1 8 1 8z"/><circle cx="8" cy="8" r="2"/></svg>',
    refresh: '<svg viewBox="0 0 16 16"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3"/></svg>',
    file: '<svg viewBox="0 0 16 16"><path d="M4 1.5h5l3.5 3.5v9.5h-8.5z M9 1.5V5h3.5"/></svg>',
    book: '<svg viewBox="0 0 16 16"><path d="M2 3.5c2-.8 4-.8 6 .6 2-1.4 4-1.4 6-.6v9c-2-.8-4-.8-6 .6-2-1.4-4-1.4-6-.6z M8 4.1v9"/></svg>',
    gear: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/></svg>',
  };

  function section(id, title, body, defaultOpen = true) {
    const open = saved.open[id] ?? defaultOpen;
    return `<details class="sec" data-sec="${id}" ${open ? 'open' : ''}><summary>${title}</summary><div class="sec-body">${body}</div></details>`;
  }

  function segmented(key, options) {
    return `<div class="seg" role="radiogroup" data-key="${key}">${options
      .map(([v, label]) => `<button role="radio" data-value="${v}">${label}</button>`)
      .join('')}</div>`;
  }

  function toggle(key, label, hint) {
    return `<label class="toggle"><span><span class="t-label">${label}</span>${
      hint ? `<span class="t-hint">${hint}</span>` : ''
    }</span><input type="checkbox" data-key="${key}"><span class="switch" aria-hidden="true"></span></label>`;
  }

  // ── skeleton (built once so inputs keep focus) ──────────────────────
  app.innerHTML = `
    <header class="card" id="current"></header>
    <div class="actions">
      <button class="primary" id="btn-open">${ICON.eye}<span>Open Preview</span></button>
      <button class="icon" id="btn-refresh" title="Refresh preview">${ICON.refresh}</button>
    </div>
    <button class="guide-card" id="btn-guide">${ICON.book}<span><b>New to Markdown?</b><span class="g-sub">Learn it in 10 minutes, with pictures</span></span></button>
    ${section(
      'look',
      'Appearance',
      `<div class="row"><span class="row-label">Theme</span>${segmented('theme', [
        ['auto', 'Auto'],
        ['light', 'Light'],
        ['dark', 'Dark'],
      ])}</div>
       <div class="row"><span class="row-label">Font size</span>
         <div class="stepper"><button data-step="-1" title="Smaller">−</button><output id="font-size">15</output><button data-step="1" title="Larger">+</button></div>
       </div>`,
    )}
    ${section(
      'refresh',
      'Refresh',
      `<div class="row"><span class="row-label">Update on</span>${segmented('refreshOn', [
        ['type', 'Typing'],
        ['save', 'Save'],
        ['both', 'Both'],
      ])}</div>`,
    )}
    ${section(
      'features',
      'Features',
      toggle('scrollSync', 'Scroll sync', 'Preview follows the editor') +
        toggle('math', 'Math', 'KaTeX $…$ and $$…$$') +
        toggle('mermaid', 'Mermaid diagrams', '```mermaid blocks'),
    )}
    ${section('stats', 'Document', '<div class="stats" id="stats"></div>')}
    ${section('outline', 'Outline', '<ul class="outline" id="outline"></ul>')}
    ${section(
      'files',
      'Markdown Files',
      `<div class="filter-row"><input id="filter" type="search" placeholder="Filter files" spellcheck="false">
         <button class="icon small" id="btn-rescan" title="Rescan workspace">${ICON.refresh}</button></div>
       <ul class="files" id="files"></ul>`,
      false,
    )}
    <footer><a href="#" id="btn-settings">${ICON.gear}<span>All settings</span></a>
      <span class="by">Markdown Live Viewer · Lawrence Shin</span></footer>`;

  const $ = (id) => document.getElementById(id);
  const filter = $('filter');
  filter.value = saved.filter || '';

  // ── events ──────────────────────────────────────────────────────────
  $('btn-open').addEventListener('click', () => send({ type: 'openPreview' }));
  $('btn-refresh').addEventListener('click', () => send({ type: 'refreshPreview' }));
  $('btn-guide').addEventListener('click', () => send({ type: 'openGuide' }));
  $('btn-rescan').addEventListener('click', () => send({ type: 'rescanFiles' }));
  $('btn-settings').addEventListener('click', (e) => {
    e.preventDefault();
    send({ type: 'openSettings' });
  });

  app.querySelectorAll('details.sec').forEach((d) =>
    d.addEventListener('toggle', () => {
      saved.open[d.dataset.sec] = d.open;
      persist();
    }),
  );

  app.querySelectorAll('.seg').forEach((seg) =>
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      setSeg(seg, b.dataset.value);
      send({ type: 'setConfig', key: seg.dataset.key, value: b.dataset.value });
    }),
  );

  app.querySelectorAll('input[type=checkbox][data-key]').forEach((cb) =>
    cb.addEventListener('change', () => send({ type: 'setConfig', key: cb.dataset.key, value: cb.checked })),
  );

  app.querySelectorAll('.stepper button').forEach((b) =>
    b.addEventListener('click', () => {
      const cur = state ? state.config.fontSize : 15;
      const next = Math.min(28, Math.max(10, cur + Number(b.dataset.step)));
      if (state) state.config.fontSize = next;
      $('font-size').textContent = next;
      send({ type: 'setConfig', key: 'fontSize', value: next });
    }),
  );

  $('outline').addEventListener('click', (e) => {
    const li = e.target.closest('[data-line]');
    if (li) send({ type: 'reveal', line: Number(li.dataset.line) });
  });

  $('files').addEventListener('click', (e) => {
    const li = e.target.closest('[data-uri]');
    if (li) send({ type: 'openFile', uri: li.dataset.uri });
  });

  filter.addEventListener('input', () => {
    saved.filter = filter.value;
    persist();
    renderFiles();
  });

  // ── rendering ───────────────────────────────────────────────────────
  function setSeg(seg, value) {
    seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.value === value)));
  }

  function renderCurrent() {
    const d = state.doc;
    const prev = state.previewOpen
      ? `<span class="pill on">Preview open${state.previewFile ? ' · ' + esc(state.previewFile) : ''}</span>`
      : '<span class="pill">Preview closed</span>';
    $('current').innerHTML = d
      ? `<div class="cur-name">${ICON.file}<span title="${esc(d.path)}">${esc(d.name)}</span>${
          d.dirty ? '<span class="dirty" title="Unsaved changes">●</span>' : ''
        }</div><div class="cur-path">${esc(d.path)}</div>${prev}`
      : `<div class="cur-name muted">No Markdown file</div><div class="cur-path">Open a .md file to preview it.</div>${prev}`;
    $('btn-open').disabled = !d;
    $('btn-open').querySelector('span').textContent = state.previewOpen ? 'Show Preview' : 'Open Preview';
    $('btn-refresh').disabled = !state.previewOpen;
  }

  function renderConfig() {
    const c = state.config;
    app.querySelectorAll('.seg').forEach((seg) => setSeg(seg, c[seg.dataset.key]));
    app.querySelectorAll('input[type=checkbox][data-key]').forEach((cb) => (cb.checked = !!c[cb.dataset.key]));
    $('font-size').textContent = c.fontSize;
  }

  function renderStats() {
    const s = state.doc && state.doc.stats;
    if (!s) {
      $('stats').innerHTML = '<p class="empty">—</p>';
      return;
    }
    const items = [
      [s.words.toLocaleString(), 'words'],
      [s.readingMinutes + ' min', 'read time'],
      [s.lines.toLocaleString(), 'lines'],
      [s.headings, 'headings'],
      [s.diagrams, 'diagrams'],
      [s.codeBlocks, 'code blocks'],
    ];
    $('stats').innerHTML = items
      .map(([v, l]) => `<div class="stat"><span class="v">${v}</span><span class="l">${l}</span></div>`)
      .join('');
  }

  function renderOutline() {
    const o = state.doc ? state.doc.outline : [];
    if (!o.length) {
      $('outline').innerHTML = '<li class="empty">No headings</li>';
      return;
    }
    const min = Math.min(...o.map((h) => h.level));
    $('outline').innerHTML = o
      .map(
        (h) =>
          `<li data-line="${h.line}" style="--depth:${h.level - min}" title="Line ${h.line + 1}"><span class="lvl">H${h.level}</span><span class="txt">${esc(
            h.text || '(empty)',
          )}</span></li>`,
      )
      .join('');
  }

  function renderFiles() {
    if (!state) return;
    const q = filter.value.trim().toLowerCase();
    const cur = state.doc && state.doc.uri;
    const list = state.files.filter((f) => !q || (f.dir + '/' + f.name).toLowerCase().includes(q));
    $('files').innerHTML = list.length
      ? list
          .slice(0, 300)
          .map(
            (f) =>
              `<li data-uri="${esc(f.uri)}" class="${f.uri === cur ? 'active' : ''}" title="${esc(
                (f.dir ? f.dir + '/' : '') + f.name,
              )}"><span class="fname">${esc(f.name)}</span><span class="fdir">${esc(f.dir)}</span></li>`,
          )
          .join('')
      : `<li class="empty">${state.files.length ? 'No match' : 'No Markdown files in workspace'}</li>`;
  }

  window.addEventListener('message', (e) => {
    if (e.data.type !== 'state') return;
    state = e.data;
    renderCurrent();
    renderConfig();
    renderStats();
    renderOutline();
    renderFiles();
  });

  send({ type: 'ready' });
})();
