// Bundles the extension and copies the webview's third-party assets into dist/.
import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';

const watch = process.argv.includes('--watch');

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/media/katex', { recursive: true });

cpSync('node_modules/katex/dist/katex.min.css', 'dist/media/katex/katex.min.css');
cpSync('node_modules/katex/dist/fonts', 'dist/media/katex/fonts', { recursive: true });
cpSync('node_modules/mermaid/dist/mermaid.min.js', 'dist/media/mermaid.min.js');
cpSync('media', 'dist/media', { recursive: true });

const common = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  external: ['vscode'],
  sourcemap: watch,
  minify: !watch,
  logLevel: 'info',
};

const builds = [
  { ...common, entryPoints: ['src/extension.ts'], outfile: 'dist/extension.js' },
  // Stand-alone renderer bundle used by the unit tests.
  { ...common, entryPoints: ['src/renderer.ts'], outfile: 'dist/renderer.js', minify: false },
];

if (watch) {
  for (const b of builds) await (await esbuild.context(b)).watch();
} else {
  await Promise.all(builds.map((b) => esbuild.build(b)));
}
