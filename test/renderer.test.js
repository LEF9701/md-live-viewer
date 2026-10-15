// Run with: npm test
const test = require('node:test');
const assert = require('node:assert');
const { createRenderer, slugify, isRemote } = require('../dist/renderer.js');

const render = createRenderer({ math: true, mermaid: true, resolveResource: (s) => 'RES:' + s });

test('blocks carry 0-based data-line', () => {
  const html = render('# Title\n\nPara one\n\n- a\n- b\n');
  assert.match(html, /<h1 data-line="0" id="title">/);
  assert.match(html, /<p data-line="2">Para one/);
  assert.match(html, /<ul data-line="4">/);
});

test('mermaid fences become diagram blocks with escaped source', () => {
  const html = render('```mermaid\ngraph TD\n  A-->B<br>\n```\n');
  assert.match(html, /<div class="mermaid-block" data-line="0"><pre class="mermaid-src">graph TD\n  A--&gt;B&lt;br&gt;/);
});

test('mermaid can be disabled', () => {
  const r = createRenderer({ math: true, mermaid: false });
  assert.doesNotMatch(r('```mermaid\ngraph TD\n```\n'), /mermaid-block/);
});

test('code is syntax highlighted', () => {
  const html = render('```js\nconst x = 1;\n```\n');
  assert.match(html, /<pre data-line="0"><code class="hljs language-js"><span class="hljs-keyword">const<\/span>/);
});

test('inline and display math render with KaTeX', () => {
  const html = render('Euler $e^{i\\pi}+1=0$\n\n$$\\int_0^1 x\\,dx$$\n');
  assert.match(html, /class="katex"/);
  assert.match(html, /katex-display/);
});

test('bad math does not throw', () => {
  assert.doesNotThrow(() => render('$\\frac{$'));
});

test('task lists, footnotes, tables', () => {
  const html = render('- [x] done\n- [ ] todo\n\nText[^1]\n\n[^1]: note\n\n| a | b |\n|---|---|\n| 1 | 2 |\n');
  assert.match(html, /task-list-item/);
  assert.match(html, /footnote-ref/);
  assert.match(html, /<table data-line=/);
});

test('local images go through resolveResource', () => {
  assert.match(render('![x](img/a.png)'), /src="RES:img\/a.png"/);
});

test('heading ids are unique', () => {
  const html = render('## Intro\n\n## Intro\n');
  assert.match(html, /id="intro"/);
  assert.match(html, /id="intro-1"/);
});

test('helpers', () => {
  assert.strictEqual(slugify('Hello, World!'), 'hello-world');
  assert.strictEqual(slugify('中文 標題'), '中文-標題');
  assert.ok(isRemote('https://a.b/c.png'));
  assert.ok(isRemote('data:image/png;base64,AA'));
  assert.ok(!isRemote('./pic.png'));
});

test('analyze: outline and stats', () => {
  const { analyze } = require('../dist/renderer.js');
  const src = '# Top\n\nHello world, two more.\n\n## Sub `code`\n\n中文字\n\n```mermaid\ngraph TD\n```\n\n```js\nx\n```\n\n![a](b.png)\n';
  const { outline, stats } = analyze(src);
  assert.deepStrictEqual(outline.map((h) => [h.level, h.text, h.line]), [[1, 'Top', 0], [2, 'Sub code', 4]]);
  assert.strictEqual(stats.diagrams, 1);
  assert.strictEqual(stats.codeBlocks, 1);
  assert.strictEqual(stats.images, 1);
  assert.strictEqual(stats.headings, 2);
  assert.ok(stats.words >= 9, 'counts latin words and CJK chars: ' + stats.words);
});
