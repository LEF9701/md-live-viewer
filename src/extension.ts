import * as vscode from 'vscode';
import { PreviewPanel, VIEW_TYPE } from './previewPanel';
import { DashboardProvider, DASHBOARD_VIEW } from './dashboard';
import { GuidePanel } from './guide';
import { NEXT_THEME, readConfig, setTheme } from './config';

const THEME_LABEL = { auto: '$(color-mode) Auto', light: '$(sun) Light', dark: '$(moon) Dark' } as const;

export function activate(ctx: vscode.ExtensionContext): void {
  const extUri = ctx.extensionUri;
  const dashboard = new DashboardProvider(extUri);

  ctx.subscriptions.push(
    dashboard,
    vscode.window.registerWebviewViewProvider(DASHBOARD_VIEW, dashboard, {
      webviewOptions: { retainContextWhenHidden: true },
    }),

    vscode.commands.registerCommand('mdViewer.openPreview', async (uri?: vscode.Uri) => {
      let doc: vscode.TextDocument | undefined;
      if (uri instanceof vscode.Uri) {
        doc = await vscode.workspace.openTextDocument(uri);
      } else {
        const active = vscode.window.activeTextEditor?.document;
        doc = active?.languageId === 'markdown' ? active : dashboard.document;
      }
      if (doc) PreviewPanel.show(extUri, doc);
      else vscode.window.showInformationMessage('MD Viewer: open a Markdown file first.');
    }),
    vscode.commands.registerCommand('mdViewer.toggleTheme', () => setTheme(NEXT_THEME[readConfig().theme])),
    vscode.commands.registerCommand('mdViewer.refresh', () => PreviewPanel.current?.refresh()),
    vscode.commands.registerCommand('mdViewer.openGuide', () => GuidePanel.show(extUri, () => dashboard.document)),
    vscode.commands.registerCommand('mdViewer.rescanFiles', () => dashboard.scanFiles()),
    vscode.commands.registerCommand('mdViewer.openSettings', () =>
      vscode.commands.executeCommand('workbench.action.openSettings', 'mdViewer'),
    ),

    vscode.window.registerWebviewPanelSerializer(VIEW_TYPE, {
      async deserializeWebviewPanel(panel: vscode.WebviewPanel, state: { uri?: string } | undefined) {
        let doc: vscode.TextDocument | undefined;
        if (state?.uri) {
          try {
            doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(state.uri));
          } catch {
            /* file gone */
          }
        }
        PreviewPanel.revive(panel, extUri, doc);
      },
    }),
  );

  // First run: offer the beginner guide once.
  if (!ctx.globalState.get<boolean>('guideOffered')) {
    void ctx.globalState.update('guideOffered', true);
    void vscode.window
      .showInformationMessage(
        'Markdown Live Viewer is installed. New to Markdown? The friendly guide explains it in 10 minutes.',
        'Open the guide',
        'No thanks',
      )
      .then((pick) => pick === 'Open the guide' && vscode.commands.executeCommand('mdViewer.openGuide'));
  }

  // Status bar: shows the preview theme; click to cycle it.
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  status.command = 'mdViewer.toggleTheme';
  status.tooltip = 'MD Viewer preview theme (click to change)';
  const refreshStatus = () => {
    status.text = THEME_LABEL[readConfig().theme];
    const ed = vscode.window.activeTextEditor;
    if (ed?.document.languageId === 'markdown') status.show();
    else status.hide();
  };
  refreshStatus();
  ctx.subscriptions.push(
    status,
    vscode.window.onDidChangeActiveTextEditor(refreshStatus),
    vscode.workspace.onDidChangeConfiguration((e) => e.affectsConfiguration('mdViewer.theme') && refreshStatus()),
  );
}

export function deactivate(): void {
  PreviewPanel.current?.dispose();
}
