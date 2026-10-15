import * as vscode from 'vscode';

export type ThemeMode = 'auto' | 'light' | 'dark';
export type RefreshOn = 'type' | 'save' | 'both';

export interface ViewerConfig {
  refreshOn: RefreshOn;
  typeDelay: number;
  theme: ThemeMode;
  scrollSync: boolean;
  math: boolean;
  mermaid: boolean;
  fontSize: number;
  customCss: string;
}

export function readConfig(): ViewerConfig {
  const c = vscode.workspace.getConfiguration('mdViewer');
  return {
    refreshOn: c.get<RefreshOn>('refreshOn', 'both'),
    typeDelay: c.get<number>('typeDelay', 150),
    theme: c.get<ThemeMode>('theme', 'auto'),
    scrollSync: c.get<boolean>('scrollSync', true),
    math: c.get<boolean>('math', true),
    mermaid: c.get<boolean>('mermaid', true),
    fontSize: c.get<number>('fontSize', 15),
    customCss: c.get<string>('customCss', ''),
  };
}

export const NEXT_THEME: Record<ThemeMode, ThemeMode> = { auto: 'light', light: 'dark', dark: 'auto' };

export async function setTheme(mode: ThemeMode): Promise<void> {
  await vscode.workspace
    .getConfiguration('mdViewer')
    .update('theme', mode, vscode.ConfigurationTarget.Global);
}
