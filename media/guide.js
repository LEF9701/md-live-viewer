// Beginner-friendly Markdown guide (webview side).
(function () {
  'use strict';
  const vscode = acquireVsCodeApi();
  const root = document.getElementById('guide');
  let mode = 'auto';
  let effective = null;
  let idSeq = 0;

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // ── pictures ────────────────────────────────────────────────────────
  const PIC_WINDOW = `
<svg class="ill" viewBox="0 0 640 300" role="img" aria-label="The VS Code window: the Markdown Live Viewer icon on the far left, the dashboard with the Open Preview button, your text in the middle, and the finished page on the right.">
  <rect x="1" y="1" width="638" height="298" rx="12" class="w-win"/>
  <path d="M1 13a12 12 0 0 1 12-12h614a12 12 0 0 1 12 12v19H1z" class="w-bar"/>
  <circle cx="18" cy="16" r="4.5" fill="#ff5f57"/><circle cx="33" cy="16" r="4.5" fill="#febc2e"/><circle cx="48" cy="16" r="4.5" fill="#28c840"/>
  <text x="320" y="20" class="t-muted" text-anchor="middle" font-size="10">notes.md — Visual Studio Code</text>

  <rect x="1" y="32" width="40" height="256" class="w-act"/>
  <rect x="11" y="46" width="20" height="20" rx="4" class="w-icon"/>
  <rect x="11" y="80" width="20" height="20" rx="4" class="w-icon"/>
  <rect x="11" y="114" width="20" height="20" rx="4" class="w-icon"/>
  <rect x="8" y="145" width="26" height="26" rx="6" class="w-hi"/>
  <path d="M13 165v-10l3.5 4 3.5-4v10M25 155v9M22.5 161.5l2.5 3 2.5-3" class="w-hi-line"/>
  <path d="M1 289h40" class="w-line"/>

  <rect x="41" y="32" width="138" height="256" class="w-side"/>
  <text x="53" y="52" class="t-muted" font-size="8.5" letter-spacing=".8">DASHBOARD</text>
  <rect x="53" y="62" width="114" height="24" rx="4" class="w-btn"/>
  <text x="110" y="78" text-anchor="middle" class="t-btn" font-size="10.5" font-weight="600">Open Preview</text>
  <rect x="53" y="102" width="86" height="6" rx="3" class="w-skel"/>
  <rect x="53" y="116" width="104" height="6" rx="3" class="w-skel"/>
  <rect x="53" y="130" width="70" height="6" rx="3" class="w-skel"/>
  <rect x="53" y="154" width="34" height="26" rx="3" class="w-skel2"/><rect x="91" y="154" width="34" height="26" rx="3" class="w-skel2"/><rect x="129" y="154" width="34" height="26" rx="3" class="w-skel2"/>

  <rect x="179" y="32" width="230" height="256" class="w-ed"/>
  <rect x="179" y="32" width="88" height="24" class="w-tab"/>
  <text x="191" y="48" font-size="10" class="t-fg">notes.md</text>
  <g font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12" class="t-fg">
    <text x="195" y="86"><tspan class="t-acc">#</tspan> Shopping list</text>
    <text x="195" y="120"><tspan class="t-acc">-</tspan> <tspan class="t-acc">**</tspan>Milk<tspan class="t-acc">**</tspan></text>
    <text x="195" y="142"><tspan class="t-acc">-</tspan> Bread</text>
    <text x="195" y="164"><tspan class="t-acc">- [ ]</tspan> Eggs</text>
    <text x="195" y="198"><tspan class="t-acc">&gt;</tspan> Buy before 6 pm</text>
  </g>
  <rect x="336" y="154" width="1.6" height="14" class="w-caret"/>

  <rect x="409" y="32" width="230" height="256" class="w-prev"/>
  <rect x="409" y="32" width="120" height="24" class="w-tab2"/>
  <text x="421" y="48" font-size="10" class="t-paper-muted">Preview notes.md</text>
  <text x="425" y="90" font-size="19" font-weight="700" class="t-paper">Shopping list</text>
  <path d="M425 100h196" class="w-paper-line"/>
  <g font-size="12.5" class="t-paper">
    <circle cx="431" cy="122" r="2.2" class="w-paper-dot"/><text x="441" y="126" font-weight="700">Milk</text>
    <circle cx="431" cy="144" r="2.2" class="w-paper-dot"/><text x="441" y="148">Bread</text>
    <rect x="427" y="161" width="9" height="9" rx="2" class="w-paper-box"/><text x="441" y="170">Eggs</text>
  </g>
  <rect x="425" y="186" width="3" height="18" class="w-paper-quote"/>
  <text x="435" y="199" font-size="12" font-style="italic" class="t-paper-muted">Buy before 6 pm</text>

  <g class="badge"><circle cx="46" cy="146" r="10"/><text x="46" y="150" text-anchor="middle">1</text></g>
  <g class="badge"><circle cx="172" cy="62" r="10"/><text x="172" y="66" text-anchor="middle">2</text></g>
  <g class="badge"><circle cx="390" cy="76" r="10"/><text x="390" y="80" text-anchor="middle">3</text></g>
  <g class="badge"><circle cx="622" cy="76" r="10"/><text x="622" y="80" text-anchor="middle">4</text></g>
</svg>`;

  const PIC_FILE = `
<svg class="ill small" viewBox="0 0 220 120" role="img" aria-label="A file named notes.md">
  <path d="M80 12h40l20 20v66a4 4 0 0 1-4 4H80a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z" class="w-paperfile"/>
  <path d="M120 12v20h20" class="w-fold"/>
  <rect x="88" y="44" width="40" height="5" rx="2.5" class="w-skel"/><rect x="88" y="56" width="32" height="5" rx="2.5" class="w-skel"/><rect x="88" y="68" width="38" height="5" rx="2.5" class="w-skel"/>
  <rect x="62" y="84" width="96" height="26" rx="13" class="w-pill"/>
  <text x="110" y="101" text-anchor="middle" font-size="12.5" class="t-fg">notes<tspan class="t-acc" font-weight="700">.md</tspan></text>
</svg>`;

  const PIC_ICON = `
<svg class="ill small" viewBox="0 0 220 120" role="img" aria-label="Click the Markdown Live Viewer icon in the left bar">
  <rect x="70" y="6" width="44" height="108" rx="8" class="w-act"/>
  <rect x="82" y="16" width="20" height="20" rx="4" class="w-icon"/>
  <rect x="82" y="44" width="20" height="20" rx="4" class="w-icon"/>
  <rect x="79" y="71" width="26" height="26" rx="6" class="w-hi"/>
  <path d="M84 91v-10l3.5 4 3.5-4v10M96 81v9M93.5 87.5l2.5 3 2.5-3" class="w-hi-line"/>
  <path d="M120 86l0 22 6-6 5 10 4-2-5-10 8 0z" class="w-cursor"/>
</svg>`;

  const PIC_SPLIT = `
<svg class="ill small" viewBox="0 0 220 120" role="img" aria-label="Type on the left, see the result on the right">
  <rect x="8" y="10" width="92" height="100" rx="6" class="w-ed"/>
  <g font-family="ui-monospace, Menlo, Consolas, monospace" font-size="10" class="t-fg">
    <text x="16" y="32"><tspan class="t-acc">#</tspan> Hello</text>
    <text x="16" y="54"><tspan class="t-acc">**</tspan>bold<tspan class="t-acc">**</tspan></text>
    <text x="16" y="76"><tspan class="t-acc">-</tspan> item</text>
  </g>
  <path d="M104 60h12m-5-5 5 5-5 5" class="w-arrow"/>
  <rect x="120" y="10" width="92" height="100" rx="6" class="w-prev"/>
  <text x="128" y="36" font-size="15" font-weight="700" class="t-paper">Hello</text>
  <text x="128" y="58" font-size="11" font-weight="700" class="t-paper">bold</text>
  <circle cx="131" cy="76" r="2" class="w-paper-dot"/><text x="137" y="80" font-size="11" class="t-paper">item</text>
</svg>`;

  // ── theme ───────────────────────────────────────────────────────────
  function vscodeIsDark() {
    const c = document.body.classList;
    if (c.contains('vscode-light') || c.contains('vscode-high-contrast-light')) return false;
    return c.contains('vscode-dark') || c.contains('vscode-high-contrast');
  }
  function applyTheme() {
    const eff = mode === 'auto' ? (vscodeIsDark() ? 'dark' : 'light') : mode;
    document.documentElement.dataset.theme = eff;
    if (eff !== effective) {
      const changed = effective !== null;
      effective = eff;
      if (window.mermaid) {
        window.mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: eff === 'dark' ? 'dark' : 'default' });
      }
      if (changed) renderMermaid(document);
    }
  }
  new MutationObserver(() => mode === 'auto' && applyTheme()).observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
  });

  async function renderMermaid(scope) {
    if (!window.mermaid) return;
    for (const block of scope.querySelectorAll('.mermaid-block')) {
      const src = block.querySelector('.mermaid-src').textContent;
      let out = block.querySelector(':scope > .mermaid-out');
      if (!out) {
        out = document.createElement('div');
        out.className = 'mermaid-out';
        block.appendChild(out);
      }
      const id = 'g-mmd-' + ++idSeq;
      try {
        const { svg } = await window.mermaid.render(id, src);
        out.innerHTML = svg;
        block.classList.remove('has-error');
        block.querySelector('.mermaid-error')?.remove();
      } catch (err) {
        document.getElementById('d' + id)?.remove();
        block.classList.add('has-error');
        let box = block.querySelector('.mermaid-error');
        if (!box) {
          box = document.createElement('div');
          box.className = 'mermaid-error';
          block.appendChild(box);
        }
        box.textContent = 'This diagram has a typo: ' + String((err && err.message) || err).split('\n')[0];
      }
    }
  }

  // ── page ────────────────────────────────────────────────────────────
  function lessonCard(l, i) {
    return `
<section class="lesson" id="l-${l.id}">
  <header><span class="num">${i + 1}</span><h2>${esc(l.title)}</h2></header>
  <p class="explain">${l.explain}</p>
  <div class="pair">
    <div class="side type">
      <div class="side-head"><span class="side-label">You type</span>
        <span class="side-actions">
          <button class="mini" data-act="copy" data-id="${l.id}" title="Copy this example">Copy</button>
          <button class="mini" data-act="insert" data-id="${l.id}" title="Add this example to your open Markdown file">Insert into my file</button>
        </span></div>
      <pre class="src">${esc(l.md)}</pre>
    </div>
    <div class="side see">
      <div class="side-head"><span class="side-label">You see</span></div>
      <div class="markdown-body result">${l.html}</div>
    </div>
  </div>
  ${l.tip ? `<p class="tip"><span class="tip-icon" aria-hidden="true">💡</span><span>${l.tip}</span></p>` : ''}
</section>`;
  }

  function build(data) {
    const basics = data.lessons.filter((l) => !l.extra);
    const extras = data.lessons.filter((l) => l.extra);
    const byId = Object.fromEntries(data.lessons.map((l) => [l.id, l]));

    root.innerHTML = `
<div class="hero">
  <p class="kicker">Markdown Guide</p>
  <h1>Markdown, explained simply</h1>
  <p class="lead">No experience needed. In about 10 minutes you’ll know everything you need for notes, reports and to-do lists.</p>
</div>

<section class="block">
  <h2 class="block-title">What is Markdown?</h2>
  <p class="body">Markdown is a simple way to make text look nice — <b>titles</b>, <b>bold words</b>, <b>lists</b>, <b>tables</b> — by typing a few ordinary symbols like <code>#</code> and <code>*</code>. You write plain text, and the preview turns it into a neat, finished page.</p>
  <p class="body">Your files stay plain text, so they open on any computer, in any app, today and in 20 years.</p>
  <figure class="pic">${PIC_WINDOW}
    <figcaption>
      <ol class="legend">
        <li><span><b>Click the icon</b> in the far-left bar to open the dashboard.</span></li>
        <li><span><b>Press Open Preview.</b></span></li>
        <li><span><b>Type</b> your text in the middle.</span></li>
        <li><span><b>See</b> the finished page on the right — it updates while you type.</span></li>
      </ol>
    </figcaption>
  </figure>
</section>

<section class="block">
  <h2 class="block-title">Get started in 3 steps</h2>
  <div class="steps">
    <div class="step">${PIC_FILE}<p><b>1. Make a file</b> whose name ends in <code>.md</code>, like <code>notes.md</code>.<br><span class="muted">File → New File, then save it.</span></p></div>
    <div class="step">${PIC_ICON}<p><b>2. Click the icon</b> in the left bar, then <b>Open Preview</b>.</p></div>
    <div class="step">${PIC_SPLIT}<p><b>3. Start typing.</b> The preview follows along by itself.</p></div>
  </div>
  <div class="cta">
    <button class="primary" id="btn-practice">Create a practice file for me</button>
    <span class="muted">Opens a ready-made example with the preview beside it.</span>
  </div>
</section>

<nav class="toc" aria-label="Lessons">
  ${data.lessons.map((l, i) => `<a href="#l-${l.id}" class="chip${l.extra ? ' extra' : ''}"><span>${i + 1}</span>${esc(l.title)}</a>`).join('')}
</nav>

<h2 class="group">The basics</h2>
${basics.map((l, i) => lessonCard(l, i)).join('')}

<h2 class="group">Extras <span class="muted">— nice to know, not required</span></h2>
${extras.map((l, i) => lessonCard(l, basics.length + i)).join('')}

<section class="block" id="mistakes">
  <h2 class="block-title">Common mistakes</h2>
  <p class="body">If something doesn’t look right, it’s almost always one of these. Most of them are a missing or extra space.</p>
  <div class="mistakes">
    ${data.mistakes
      .map(
        (m) => `<div class="mistake">
      <div class="m wrong"><span class="mark" aria-label="Wrong">✗</span><pre>${esc(m.wrong)}</pre></div>
      <div class="m right"><span class="mark" aria-label="Right">✓</span><pre>${esc(m.right)}</pre></div>
      <p class="why">${esc(m.why)}</p>
    </div>`,
      )
      .join('')}
  </div>
</section>

<section class="block" id="cheatsheet">
  <h2 class="block-title">Cheat sheet</h2>
  <p class="body">Everything on one screen. Click a box to jump to its lesson.</p>
  <div class="cheats">
    ${data.lessons
      .map(
        (l) => `<a class="cheat" href="#l-${l.id}"><span class="c-title">${esc(l.title)}</span><code>${esc(l.cheat)}</code></a>`,
      )
      .join('')}
  </div>
</section>

<section class="block" id="playground">
  <h2 class="block-title">Try it yourself</h2>
  <p class="body">Type anything in the left box. Nothing here is saved, so experiment freely.</p>
  <div class="pair play">
    <div class="side type"><div class="side-head"><span class="side-label">You type</span></div>
      <textarea id="play-input" spellcheck="false" aria-label="Type Markdown here"></textarea></div>
    <div class="side see"><div class="side-head"><span class="side-label">You see</span></div>
      <div class="markdown-body result" id="play-output"></div></div>
  </div>
</section>

<footer class="foot">Markdown Live Viewer · Lawrence Shin</footer>`;

    // actions
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-act]');
      if (btn) {
        const l = byId[btn.dataset.id];
        vscode.postMessage({ type: btn.dataset.act, text: l.md });
        if (btn.dataset.act === 'copy') flash(btn, 'Copied ✓');
        return;
      }
      const a = e.target.closest('a[href^="#"]');
      if (a) {
        e.preventDefault();
        document.getElementById(a.getAttribute('href').slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const ext = e.target.closest('a[href]');
      if (ext) e.preventDefault(); // links inside examples are just for show
    });
    document.getElementById('btn-practice').addEventListener('click', () => vscode.postMessage({ type: 'practice' }));

    const input = document.getElementById('play-input');
    const output = document.getElementById('play-output');
    input.value = data.playground;
    output.innerHTML = data.playgroundHtml;
    let t;
    input.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => vscode.postMessage({ type: 'render', text: input.value }), 120);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        input.setRangeText('  ', input.selectionStart, input.selectionEnd, 'end');
        input.dispatchEvent(new Event('input'));
      }
    });

    applyTheme();
    renderMermaid(root);
  }

  function flash(btn, text) {
    const old = btn.textContent;
    btn.textContent = text;
    btn.classList.add('done');
    setTimeout(() => {
      btn.textContent = old;
      btn.classList.remove('done');
    }, 1500);
  }

  window.addEventListener('message', (e) => {
    const m = e.data;
    if (m.type === 'init') {
      mode = m.theme;
      build(m);
    } else if (m.type === 'rendered') {
      const out = document.getElementById('play-output');
      out.innerHTML = m.html;
      renderMermaid(out);
    } else if (m.type === 'theme') {
      mode = m.theme;
      applyTheme();
    }
  });

  applyTheme();
  vscode.postMessage({ type: 'ready' });
})();
