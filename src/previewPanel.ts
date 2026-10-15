import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { createRenderer, isRemote } from './renderer';
import { readConfig, setTheme, ThemeMode, ViewerConfig } from './config';

export const VIEW_TYPE = 'mdViewer.preview';

type FromWebview =
  | { type: 'ready' }
  | { type: 'reveal'; line: number }
  | { type: 'link'; href: string }
  | { type: 'setTheme'; mode: ThemeMode };

/**
 * A single preview tab that follows the active Markdown editor,
 * like LaTeX Workshop's tab viewer.
 */
export class PreviewPanel implements vscode.Disposable {
  static current: PreviewPanel | undefined;
  private static readonly changed = new vscode.EventEmitter<void>();
  /** Fires when the preview opens, closes or switches document. */
  static readonly onDidChange = PreviewPanel.changed.event;

  get document(): vscode.TextDocument | undefined {
    return this.doc;
  }

  private doc: vscode.TextDocument | undefined;
  private ready = false;
  private timer: NodeJS.Timeout | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  static show(extUri: vscode.Uri, doc: vscode.TextDocument): void {
    if (PreviewPanel.current) {
      PreviewPanel.current.panel.reveal(vscode.ViewColumn.Beside, true);
      PreviewPanel.current.setDocument(doc);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      VIEW_TYPE,
      'Preview',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: true },
    );
    PreviewPanel.current = new PreviewPanel(panel, extUri, doc);
  }

  /** Restore a panel after VS Code reloads. */
  static revive(panel: vscode.WebviewPanel, extUri: vscode.Uri, doc: vscode.TextDocument | undefined): void {
    PreviewPanel.current = new PreviewPanel(panel, extUri, doc);
  }

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extUri: vscode.Uri,
    doc: vscode.TextDocument | undefined,
  ) {
    this.panel.iconPath = vscode.Uri.joinPath(extUri, 'dist', 'media', 'icon.svg');
    this.panel.webview.html = this.shellHtml();

    this.disposables.push(
      this.panel.onDidDispose(() => this.dispose()),
      this.panel.webview.onDidReceiveMessage((m: FromWebview) => this.onMessage(m)),

      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document !== this.doc) return;
        const cfg = readConfig();
        if (cfg.refreshOn === 'save') return;
        this.schedule(cfg.typeDelay);
      }),
      vscode.workspace.onDidSaveTextDocument((d) => {
        if (d !== this.doc) return;
        if (readConfig().refreshOn === 'type') return;
        this.update(); // save → immediate, no debounce
      }),
      vscode.window.onDidChangeActiveTextEditor((ed) => {
        if (ed && ed.document.languageId === 'markdown' && ed.document !== this.doc) {
          this.setDocument(ed.document);
        }
      }),
      vscode.window.onDidChangeTextEditorVisibleRanges((e) => {
        if (e.textEditor.document !== this.doc || !readConfig().scrollSync) return;
        const top = e.visibleRanges[0]?.start.line ?? 0;
        this.post({ type: 'scrollTo', line: top });
      }),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('mdViewer')) this.update();
      }),
    );

    if (doc) this.setDocument(doc);
  }

  setDocument(doc: vscode.TextDocument): void {
    this.doc = doc;
    this.panel.title = `Preview ${path.basename(doc.fileName)}`;
    // Let the webview load images next to the document and in the workspace.
    const roots = [vscode.Uri.joinPath(this.extUri, 'dist', 'media')];
    if (doc.uri.scheme === 'file') roots.push(vscode.Uri.file(path.dirname(doc.fileName)));
    for (const f of vscode.workspace.workspaceFolders ?? []) roots.push(f.uri);
    this.panel.webview.options = { enableScripts: true, localResourceRoots: roots };
    this.update();
    PreviewPanel.changed.fire();
  }

  refresh(): void {
    this.update();
  }

  private schedule(delay: number): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.update(), delay);
  }

  private update(): void {
    clearTimeout(this.timer);
    if (!this.ready || !this.doc) return;
    const cfg = readConfig();
    let html: string;
    try {
      html = this.render(this.doc, cfg);
    } catch (err) {
      html = `<div class="render-error"><strong>Render failed</strong><pre>${String(err)}</pre></div>`;
    }
    const editor = vscode.window.visibleTextEditors.find((e) => e.document === this.doc);
    this.post({
      type: 'update',
      html,
      uri: this.doc.uri.toString(),
      theme: cfg.theme,
      fontSize: cfg.fontSize,
      mermaid: cfg.mermaid,
      customCss: this.loadCustomCss(cfg),
      line: cfg.scrollSync ? editor?.visibleRanges[0]?.start.line : undefined,
    });
  }

  private renderFn: ((src: string) => string) | undefined;
  private renderKey = '';

  private render(doc: vscode.TextDocument, cfg: ViewerConfig): string {
    const key = `${cfg.math}|${cfg.mermaid}`;
    if (!this.renderFn || key !== this.renderKey) {
      this.renderKey = key;
      this.renderFn = createRenderer({
        math: cfg.math,
        mermaid: cfg.mermaid,
        resolveResource: (src) => this.resolveResource(src),
      });
    }
    return this.renderFn(doc.getText());
  }

  private resolveResource(src: string): string {
    const doc = this.doc;
    if (!doc || isRemote(src) || src.startsWith('#') || doc.uri.scheme !== 'file') return src;
    let clean: string;
    try {
      clean = decodeURI(src.split(/[?#]/)[0]);
    } catch {
      clean = src;
    }
    const abs = path.isAbsolute(clean) ? clean : path.resolve(path.dirname(doc.fileName), clean);
    return this.panel.webview.asWebviewUri(vscode.Uri.file(abs)).toString();
  }

  private loadCustomCss(cfg: ViewerConfig): string {
    if (!cfg.customCss) return '';
    let p = cfg.customCss;
    if (!path.isAbsolute(p)) {
      const ws = vscode.workspace.workspaceFolders?.[0];
      if (!ws) return '';
      p = path.join(ws.uri.fsPath, p);
    }
    try {
      return fs.readFileSync(p, 'utf8');
    } catch {
      return '';
    }
  }

  private async onMessage(m: FromWebview): Promise<void> {
    switch (m.type) {
      case 'ready':
        this.ready = true;
        this.update();
        break;
      case 'setTheme':
        await setTheme(m.mode); // config change listener re-sends the update
        break;
      case 'reveal':
        await this.revealLine(m.line);
        break;
      case 'link':
        await this.openLink(m.href);
        break;
    }
  }

  private async revealLine(line: number): Promise<void> {
    if (!this.doc) return;
    let editor = vscode.window.visibleTextEditors.find((e) => e.document === this.doc);
    const column = editor?.viewColumn ?? vscode.ViewColumn.One;
    editor = await vscode.window.showTextDocument(this.doc, { viewColumn: column, preserveFocus: false });
    const pos = new vscode.Position(Math.min(line, this.doc.lineCount - 1), 0);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  }

  private async openLink(href: string): Promise<void> {
    if (/^(https?|mailto):/i.test(href)) {
      await vscode.env.openExternal(vscode.Uri.parse(href));
      return;
    }
    if (!this.doc || this.doc.uri.scheme !== 'file') return;
    const [file] = href.split('#');
    const target = path.resolve(path.dirname(this.doc.fileName), decodeURI(file));
    try {
      const doc = await vscode.workspace.openTextDocument(target);
      await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    } catch {
      vscode.window.showWarningMessage(`MD Viewer: cannot open ${href}`);
    }
  }

  private post(msg: unknown): void {
    void this.panel.webview.postMessage(msg);
  }

  private shellHtml(): string {
    const wv = this.panel.webview;
    const media = (f: string) => wv.asWebviewUri(vscode.Uri.joinPath(this.extUri, 'dist', 'media', f));
    const nonce = Array.from({ length: 32 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
    const csp = [
      `default-src 'none'`,
      `img-src ${wv.cspSource} https: data:`,
      `style-src ${wv.cspSource} 'unsafe-inline'`,
      `font-src ${wv.cspSource} data:`,
      `script-src 'nonce-${nonce}'`,
    ].join('; ');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${media('katex/katex.min.css')}">
<link rel="stylesheet" href="${media('preview.css')}">
<style id="custom-css"></style>
</head>
<body>
<div id="toolbar">
  <button id="btn-theme" title="Theme"></button>
</div>
<article id="content" class="markdown-body"></article>
<script nonce="${nonce}" src="${media('mermaid.min.js')}"></script>
<script nonce="${nonce}" src="${media('preview.js')}"></script>
</body>
</html>`;
  }

  private disposed = false;

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    PreviewPanel.current = undefined;
    PreviewPanel.changed.fire();
    clearTimeout(this.timer);
    this.panel.dispose();
    while (this.disposables.length) this.disposables.pop()?.dispose();
  }
}
