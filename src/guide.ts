import * as vscode from 'vscode';
import { createRenderer } from './renderer';
import { readConfig } from './config';
import { LESSONS, MISTAKES, PLAYGROUND_START, PRACTICE_FILE } from './guideContent';
import { PreviewPanel } from './previewPanel';

type FromGuide =
  | { type: 'ready' }
  | { type: 'render'; text: string }
  | { type: 'copy'; text: string }
  | { type: 'insert'; text: string }
  | { type: 'practice' }
  | { type: 'openPreview' };

/** Beginner-friendly Markdown guide in an editor tab. */
export class GuidePanel {
  static current: GuidePanel | undefined;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly render: (src: string) => string;

  static show(extUri: vscode.Uri, getTargetDoc: () => vscode.TextDocument | undefined): void {
    if (GuidePanel.current) {
      GuidePanel.current.panel.reveal(vscode.ViewColumn.Active);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'mdViewer.guide',
      'Markdown Guide',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extUri, 'dist', 'media')],
      },
    );
    GuidePanel.current = new GuidePanel(panel, extUri, getTargetDoc);
  }

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extUri: vscode.Uri,
    private readonly getTargetDoc: () => vscode.TextDocument | undefined,
  ) {
    const exampleImage = this.media('guide/mountain.svg').toString();
    this.render = createRenderer({
      math: true,
      mermaid: true,
      resolveResource: (src) => (src === 'images/mountain.png' ? exampleImage : src),
    });
    panel.iconPath = vscode.Uri.joinPath(extUri, 'dist', 'media', 'icon.svg');
    panel.webview.html = this.html();
    this.disposables.push(
      panel.onDidDispose(() => this.dispose()),
      panel.webview.onDidReceiveMessage((m: FromGuide) => this.onMessage(m)),
      vscode.workspace.onDidChangeConfiguration(
        (e) => e.affectsConfiguration('mdViewer.theme') && this.post({ type: 'theme', theme: readConfig().theme }),
      ),
    );
  }

  private media(f: string): vscode.Uri {
    return this.panel.webview.asWebviewUri(vscode.Uri.joinPath(this.extUri, 'dist', 'media', f));
  }

  private post(msg: unknown): void {
    void this.panel.webview.postMessage(msg);
  }

  private async onMessage(m: FromGuide): Promise<void> {
    switch (m.type) {
      case 'ready':
        this.post({
          type: 'init',
          theme: readConfig().theme,
          lessons: LESSONS.map((l) => ({ ...l, html: this.render(l.md) })),
          mistakes: MISTAKES.map((x) => ({ ...x, html: this.render(x.right) })),
          playground: PLAYGROUND_START,
          playgroundHtml: this.render(PLAYGROUND_START),
        });
        break;
      case 'render':
        this.post({ type: 'rendered', html: this.render(m.text) });
        break;
      case 'copy':
        await vscode.env.clipboard.writeText(m.text);
        vscode.window.setStatusBarMessage('$(check) Copied — paste it into your file', 2500);
        break;
      case 'insert':
        await this.insert(m.text);
        break;
      case 'practice':
        await this.openPractice();
        break;
      case 'openPreview':
        await vscode.commands.executeCommand('mdViewer.openPreview');
        break;
    }
  }

  private async insert(text: string): Promise<void> {
    const doc = this.getTargetDoc();
    if (!doc) {
      const pick = await vscode.window.showInformationMessage(
        'There is no Markdown file open yet. Create a practice file with this example?',
        'Create practice file',
      );
      if (pick) await this.openPractice(text);
      return;
    }
    const visible = vscode.window.visibleTextEditors.find((e) => e.document === doc);
    const editor = await vscode.window.showTextDocument(doc, {
      viewColumn: visible?.viewColumn ?? vscode.ViewColumn.One,
      preserveFocus: false,
    });
    const pos = editor.selection.active;
    const lineText = doc.lineAt(pos.line).text;
    const before = lineText.trim() === '' ? '' : '\n\n';
    await editor.edit((b) => b.insert(pos, `${before}${text}\n\n`));
    vscode.window.setStatusBarMessage('$(check) Example added to your file', 2500);
  }

  private async openPractice(extra?: string): Promise<void> {
    const content = extra ? `${PRACTICE_FILE}\n${extra}\n` : PRACTICE_FILE;
    const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content });
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    PreviewPanel.show(this.extUri, doc);
  }

  private html(): string {
    const wv = this.panel.webview;
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
<link rel="stylesheet" href="${this.media('katex/katex.min.css')}">
<link rel="stylesheet" href="${this.media('preview.css')}">
<link rel="stylesheet" href="${this.media('guide.css')}">
</head>
<body>
<main id="guide"></main>
<script nonce="${nonce}" src="${this.media('mermaid.min.js')}"></script>
<script nonce="${nonce}" src="${this.media('guide.js')}"></script>
</body>
</html>`;
  }

  private disposed = false;

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    GuidePanel.current = undefined;
    while (this.disposables.length) this.disposables.pop()?.dispose();
    this.panel.dispose();
  }
}
