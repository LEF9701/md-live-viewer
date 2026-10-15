import * as vscode from 'vscode';
import * as path from 'node:path';
import { analyze } from './renderer';
import { readConfig } from './config';
import { PreviewPanel } from './previewPanel';

export const DASHBOARD_VIEW = 'mdViewer.dashboard';

const EDITABLE_KEYS = new Set(['theme', 'refreshOn', 'scrollSync', 'math', 'mermaid', 'fontSize']);

type FromDashboard =
  | { type: 'ready' }
  | { type: 'openPreview' }
  | { type: 'refreshPreview' }
  | { type: 'setConfig'; key: string; value: unknown }
  | { type: 'reveal'; line: number }
  | { type: 'openFile'; uri: string }
  | { type: 'rescanFiles' }
  | { type: 'openSettings' }
  | { type: 'openGuide' };

/** Sidebar dashboard shown from the activity-bar icon. */
export class DashboardProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private view: vscode.WebviewView | undefined;
  private lastDoc: vscode.TextDocument | undefined;
  private files: { name: string; dir: string; uri: string }[] = [];
  private pushTimer: NodeJS.Timeout | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly extUri: vscode.Uri) {
    const ed = vscode.window.activeTextEditor;
    if (ed?.document.languageId === 'markdown') this.lastDoc = ed.document;

    const watcher = vscode.workspace.createFileSystemWatcher('**/*.{md,markdown}', false, true, false);
    this.disposables.push(
      watcher,
      watcher.onDidCreate(() => this.scanFiles()),
      watcher.onDidDelete(() => this.scanFiles()),
      vscode.window.onDidChangeActiveTextEditor((e) => {
        if (e?.document.languageId === 'markdown') this.lastDoc = e.document;
        this.schedule(0);
      }),
      vscode.workspace.onDidChangeTextDocument((e) => e.document === this.lastDoc && this.schedule(300)),
      vscode.workspace.onDidSaveTextDocument((d) => d === this.lastDoc && this.schedule(0)),
      vscode.workspace.onDidCloseTextDocument((d) => {
        if (d === this.lastDoc) this.lastDoc = undefined;
        this.schedule(0);
      }),
      vscode.workspace.onDidChangeConfiguration((e) => e.affectsConfiguration('mdViewer') && this.schedule(0)),
      PreviewPanel.onDidChange(() => this.schedule(0)),
    );
  }

  /** The Markdown document the dashboard is about (last focused one). */
  get document(): vscode.TextDocument | undefined {
    return this.lastDoc;
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extUri, 'dist', 'media')],
    };
    view.webview.html = this.html(view.webview);
    view.webview.onDidReceiveMessage((m: FromDashboard) => this.onMessage(m), undefined, this.disposables);
    view.onDidChangeVisibility(() => view.visible && this.schedule(0), undefined, this.disposables);
    view.onDidDispose(() => (this.view = undefined), undefined, this.disposables);
  }

  private async onMessage(m: FromDashboard): Promise<void> {
    switch (m.type) {
      case 'ready':
        await this.scanFiles();
        this.push();
        break;
      case 'openPreview':
        await vscode.commands.executeCommand('mdViewer.openPreview');
        break;
      case 'refreshPreview':
        await vscode.commands.executeCommand('mdViewer.refresh');
        break;
      case 'setConfig':
        if (EDITABLE_KEYS.has(m.key)) {
          await vscode.workspace
            .getConfiguration('mdViewer')
            .update(m.key, m.value, vscode.ConfigurationTarget.Global);
        }
        break;
      case 'reveal':
        await this.reveal(m.line);
        break;
      case 'openFile': {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(m.uri));
        const column = this.editorColumn();
        await vscode.window.showTextDocument(doc, { viewColumn: column });
        break;
      }
      case 'rescanFiles':
        await this.scanFiles();
        break;
      case 'openGuide':
        await vscode.commands.executeCommand('mdViewer.openGuide');
        break;
      case 'openSettings':
        await vscode.commands.executeCommand('workbench.action.openSettings', 'mdViewer');
        break;
    }
  }

  private editorColumn(): vscode.ViewColumn {
    const ed = vscode.window.visibleTextEditors.find((e) => e.document === this.lastDoc);
    return ed?.viewColumn ?? vscode.ViewColumn.One;
  }

  private async reveal(line: number): Promise<void> {
    if (!this.lastDoc) return;
    const ed = await vscode.window.showTextDocument(this.lastDoc, { viewColumn: this.editorColumn() });
    const pos = new vscode.Position(line, 0);
    ed.selection = new vscode.Selection(pos, pos);
    ed.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.AtTop);
  }

  async scanFiles(): Promise<void> {
    const uris = await vscode.workspace.findFiles('**/*.{md,markdown}', '**/{node_modules,.git,dist,out}/**', 500);
    this.files = uris
      .map((u) => {
        const rel = vscode.workspace.asRelativePath(u, false);
        const dir = path.dirname(rel);
        return { name: path.basename(rel), dir: dir === '.' ? '' : dir, uri: u.toString() };
      })
      .sort((a, b) => (a.dir + '/' + a.name).localeCompare(b.dir + '/' + b.name));
    this.schedule(0);
  }

  private schedule(delay: number): void {
    clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => this.push(), delay);
  }

  private push(): void {
    if (!this.view?.visible) return;
    const doc = this.lastDoc;
    const info = doc ? analyze(doc.getText()) : undefined;
    void this.view.webview.postMessage({
      type: 'state',
      config: readConfig(),
      previewOpen: !!PreviewPanel.current,
      previewFile: PreviewPanel.current?.document ? path.basename(PreviewPanel.current.document.fileName) : null,
      doc: doc
        ? {
            name: path.basename(doc.fileName),
            path: vscode.workspace.asRelativePath(doc.uri, false),
            uri: doc.uri.toString(),
            dirty: doc.isDirty,
            stats: info!.stats,
            outline: info!.outline,
          }
        : null,
      files: this.files,
    });
  }

  private html(webview: vscode.Webview): string {
    const media = (f: string) => webview.asWebviewUri(vscode.Uri.joinPath(this.extUri, 'dist', 'media', f));
    const nonce = Array.from({ length: 32 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${media('dashboard.css')}">
</head>
<body>
<div id="app"></div>
<script nonce="${nonce}" src="${media('dashboard.js')}"></script>
</body>
</html>`;
  }

  dispose(): void {
    clearTimeout(this.pushTimer);
    while (this.disposables.length) this.disposables.pop()?.dispose();
  }
}
