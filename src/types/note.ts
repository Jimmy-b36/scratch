export interface NoteMetadata {
  id: string;
  title: string;
  preview: string;
  modified: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  path: string;
  modified: number;
}

export interface VaultInfo {
  id: string;
  name: string;
  path: string;
  lastOpenedAt: number;
  isFavorite: boolean;
}

export interface ThemeSettings {
  mode: "light" | "dark" | "system";
  customLightColors?: ThemeColors;
  customDarkColors?: ThemeColors;
  themePreset?:
    | "scratch"
    | "catppuccin"
    | "tokyo-night"
    | "github"
    | "gruvbox-material"
    | "kanagawa"
    | "solarized"
    | "rose-pine"
    | "moonlight"
    | "custom";
}

export interface ThemeColors {
  bg?: string;
  bgSecondary?: string;
  bgMuted?: string;
  bgEmphasis?: string;
  text?: string;
  textMuted?: string;
  textInverse?: string;
  border?: string;
  accent?: string;
  link?: string;
  linkHover?: string;
  headingH1?: string;
  headingH2?: string;
  headingH3?: string;
  headingH4?: string;
  headingH5?: string;
  headingH6?: string;
  bold?: string;
}

export type FontFamily = "system-sans" | "serif" | "monospace";
export type TextDirection = "ltr" | "rtl";
export type EditorWidth =
  | "narrow"
  | "normal"
  | "wide"
  | "full"
  | "dynamic"
  | "custom";

export interface EditorFontSettings {
  baseFontFamily?: FontFamily;
  baseFontSize?: number; // in px, default 16
  boldWeight?: number; // 600, 700, 800 for headings and bold text
  lineHeight?: number; // default 1.6
}

// Per-folder settings (stored in .scratch/settings.json)
export interface Settings {
  theme: ThemeSettings;
  editorFont?: EditorFontSettings;
  gitEnabled?: boolean;
  pinnedNoteIds?: string[];
  textDirection?: TextDirection;
  editorWidth?: EditorWidth;
  customEditorWidthPx?: number;
  defaultNoteName?: string;
  interfaceZoom?: number;
  ollamaModel?: string;
}
