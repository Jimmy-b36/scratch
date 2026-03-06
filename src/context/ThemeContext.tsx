import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getSettings, updateSettings } from "../services/notes";
import type {
  ThemeSettings,
  ThemeColors,
  EditorFontSettings,
  FontFamily,
  TextDirection,
  EditorWidth,
} from "../types/note";

type ThemeMode = "light" | "dark" | "system";
type ThemePreset =
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

// Font family CSS values
const fontFamilyMap: Record<FontFamily, string> = {
  "system-sans":
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  monospace:
    "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Monaco, 'Courier New', monospace",
};

// Editor width CSS values for presets
const editorWidthMap: Record<Exclude<EditorWidth, "custom">, string> = {
  narrow: "36rem",
  normal: "48rem",
  wide: "64rem",
  full: "100%",
  dynamic: "clamp(48rem, 92vw, 96rem)",
};

// Default custom width in px
const DEFAULT_CUSTOM_WIDTH_PX = 768;

// Default editor font settings (simplified)
const defaultEditorFontSettings: Required<EditorFontSettings> = {
  baseFontFamily: "system-sans",
  baseFontSize: 15,
  boldWeight: 600,
  lineHeight: 1.6,
};

const defaultLightColors: Required<ThemeColors> = {
  bg: "#ffffff",
  bgSecondary: "#fafaf9",
  bgMuted: "rgba(28, 25, 23, 0.06)",
  bgEmphasis: "rgba(28, 25, 23, 0.09)",
  text: "#1c1917",
  textMuted: "#78716c",
  textInverse: "#fafaf9",
  border: "rgba(28, 25, 23, 0.08)",
  accent: "#1c1917",
  link: "#1d4ed8",
  linkHover: "#1e40af",
  headingH1: "#111827",
  headingH2: "#1f2937",
  headingH3: "#374151",
  headingH4: "#4b5563",
  headingH5: "#6b7280",
  headingH6: "#9ca3af",
  bold: "#7c2d12",
};

const defaultDarkColors: Required<ThemeColors> = {
  bg: "rgb(22, 20, 19)",
  bgSecondary: "rgb(14, 12, 11)",
  bgMuted: "rgba(250, 249, 249, 0.05)",
  bgEmphasis: "rgba(250, 249, 249, 0.08)",
  text: "#fafaf9",
  textMuted: "#a8a29e",
  textInverse: "#0c0a09",
  border: "rgba(250, 249, 249, 0.07)",
  accent: "#fafaf9",
  link: "#93c5fd",
  linkHover: "#bfdbfe",
  headingH1: "#f9fafb",
  headingH2: "#f3f4f6",
  headingH3: "#e5e7eb",
  headingH4: "#d1d5db",
  headingH5: "#9ca3af",
  headingH6: "#6b7280",
  bold: "#fdba74",
};

const themePresets: Record<
  Exclude<ThemePreset, "custom">,
  { light: ThemeColors; dark: ThemeColors }
> = {
  scratch: {
    light: defaultLightColors,
    dark: defaultDarkColors,
  },
  catppuccin: {
    light: {
      bg: "#eff1f5",
      bgSecondary: "#e6e9ef",
      bgMuted: "rgba(76, 79, 105, 0.10)",
      bgEmphasis: "rgba(76, 79, 105, 0.16)",
      text: "#4c4f69",
      textMuted: "#6c6f85",
      textInverse: "#eff1f5",
      border: "rgba(76, 79, 105, 0.18)",
      accent: "#8839ef",
      link: "#0b57d0",
      linkHover: "#1e66f5",
      headingH1: "#8839ef",
      headingH2: "#df8e1d",
      headingH3: "#40a02b",
      headingH4: "#179299",
      headingH5: "#1e66f5",
      headingH6: "#7287fd",
      bold: "#d20f39",
    },
    dark: {
      bg: "#1e1e2e",
      bgSecondary: "#181825",
      bgMuted: "rgba(205, 214, 244, 0.08)",
      bgEmphasis: "rgba(205, 214, 244, 0.14)",
      text: "#cdd6f4",
      textMuted: "#a6adc8",
      textInverse: "#1e1e2e",
      border: "rgba(205, 214, 244, 0.16)",
      accent: "#cba6f7",
      link: "#74c7ec",
      linkHover: "#89dceb",
      headingH1: "#cba6f7",
      headingH2: "#f9e2af",
      headingH3: "#a6e3a1",
      headingH4: "#94e2d5",
      headingH5: "#89b4fa",
      headingH6: "#b4befe",
      bold: "#f38ba8",
    },
  },
  "tokyo-night": {
    light: {
      bg: "#d5d6db",
      bgSecondary: "#cbccd1",
      bgMuted: "rgba(52, 63, 110, 0.12)",
      bgEmphasis: "rgba(52, 63, 110, 0.18)",
      text: "#343b58",
      textMuted: "#565f89",
      textInverse: "#d5d6db",
      border: "rgba(52, 63, 110, 0.20)",
      accent: "#34548a",
      link: "#2e7de9",
      linkHover: "#1b5dbf",
      headingH1: "#2e7de9",
      headingH2: "#8c6c3e",
      headingH3: "#33635c",
      headingH4: "#485e90",
      headingH5: "#5a4a78",
      headingH6: "#7a88cf",
      bold: "#965027",
    },
    dark: {
      bg: "#1a1b26",
      bgSecondary: "#16161e",
      bgMuted: "rgba(192, 202, 245, 0.08)",
      bgEmphasis: "rgba(192, 202, 245, 0.14)",
      text: "#c0caf5",
      textMuted: "#a9b1d6",
      textInverse: "#1a1b26",
      border: "rgba(192, 202, 245, 0.16)",
      accent: "#7aa2f7",
      link: "#7dcfff",
      linkHover: "#b4f9f8",
      headingH1: "#7aa2f7",
      headingH2: "#e0af68",
      headingH3: "#9ece6a",
      headingH4: "#7dcfff",
      headingH5: "#bb9af7",
      headingH6: "#c0caf5",
      bold: "#ff9e64",
    },
  },
  github: {
    light: {
      bg: "#ffffff",
      bgSecondary: "#f6f8fa",
      bgMuted: "rgba(31, 35, 40, 0.06)",
      bgEmphasis: "rgba(31, 35, 40, 0.12)",
      text: "#1f2328",
      textMuted: "#59636e",
      textInverse: "#ffffff",
      border: "rgba(31, 35, 40, 0.14)",
      accent: "#0969da",
      link: "#0969da",
      linkHover: "#0550ae",
      headingH1: "#1f2328",
      headingH2: "#24292f",
      headingH3: "#373e47",
      headingH4: "#57606a",
      headingH5: "#6e7781",
      headingH6: "#8c959f",
      bold: "#0f4c81",
    },
    dark: {
      bg: "#0d1117",
      bgSecondary: "#161b22",
      bgMuted: "rgba(240, 246, 252, 0.06)",
      bgEmphasis: "rgba(240, 246, 252, 0.12)",
      text: "#e6edf3",
      textMuted: "#7d8590",
      textInverse: "#0d1117",
      border: "rgba(240, 246, 252, 0.15)",
      accent: "#58a6ff",
      link: "#58a6ff",
      linkHover: "#79c0ff",
      headingH1: "#f0f6fc",
      headingH2: "#e6edf3",
      headingH3: "#c9d1d9",
      headingH4: "#a5b3c2",
      headingH5: "#8b949e",
      headingH6: "#6e7681",
      bold: "#ffa657",
    },
  },
  "gruvbox-material": {
    light: {
      bg: "#fbf1c7",
      bgSecondary: "#f2e5bc",
      bgMuted: "rgba(101, 71, 53, 0.08)",
      bgEmphasis: "rgba(101, 71, 53, 0.14)",
      text: "#654735",
      textMuted: "#7c6f64",
      textInverse: "#fbf1c7",
      border: "rgba(101, 71, 53, 0.18)",
      accent: "#458588",
      link: "#076678",
      linkHover: "#458588",
      headingH1: "#9d0006",
      headingH2: "#b57614",
      headingH3: "#79740e",
      headingH4: "#427b58",
      headingH5: "#076678",
      headingH6: "#8f3f71",
      bold: "#af3a03",
    },
    dark: {
      bg: "#282828",
      bgSecondary: "#1d2021",
      bgMuted: "rgba(235, 219, 178, 0.08)",
      bgEmphasis: "rgba(235, 219, 178, 0.14)",
      text: "#ebdbb2",
      textMuted: "#a89984",
      textInverse: "#1d2021",
      border: "rgba(235, 219, 178, 0.17)",
      accent: "#83a598",
      link: "#83a598",
      linkHover: "#89b482",
      headingH1: "#ea6962",
      headingH2: "#d8a657",
      headingH3: "#a9b665",
      headingH4: "#89b482",
      headingH5: "#7daea3",
      headingH6: "#d3869b",
      bold: "#e78a4e",
    },
  },
  kanagawa: {
    light: {
      bg: "#f2ecbc",
      bgSecondary: "#e5ddb0",
      bgMuted: "rgba(84, 84, 100, 0.08)",
      bgEmphasis: "rgba(84, 84, 100, 0.14)",
      text: "#545464",
      textMuted: "#727169",
      textInverse: "#f2ecbc",
      border: "rgba(84, 84, 100, 0.18)",
      accent: "#4d699b",
      link: "#4d699b",
      linkHover: "#5d57a3",
      headingH1: "#4d699b",
      headingH2: "#8a6a00",
      headingH3: "#6f894e",
      headingH4: "#33635c",
      headingH5: "#5a4a78",
      headingH6: "#7f805d",
      bold: "#b35b79",
    },
    dark: {
      bg: "#1f1f28",
      bgSecondary: "#16161d",
      bgMuted: "rgba(220, 215, 186, 0.08)",
      bgEmphasis: "rgba(220, 215, 186, 0.14)",
      text: "#dcd7ba",
      textMuted: "#a6a69c",
      textInverse: "#1f1f28",
      border: "rgba(220, 215, 186, 0.16)",
      accent: "#7e9cd8",
      link: "#7fb4ca",
      linkHover: "#9cabca",
      headingH1: "#7e9cd8",
      headingH2: "#e6c384",
      headingH3: "#98bb6c",
      headingH4: "#7fb4ca",
      headingH5: "#957fb8",
      headingH6: "#c8c093",
      bold: "#ffa066",
    },
  },
  solarized: {
    light: {
      bg: "#fdf6e3",
      bgSecondary: "#eee8d5",
      bgMuted: "rgba(101, 123, 131, 0.10)",
      bgEmphasis: "rgba(101, 123, 131, 0.16)",
      text: "#657b83",
      textMuted: "#93a1a1",
      textInverse: "#fdf6e3",
      border: "rgba(101, 123, 131, 0.22)",
      accent: "#268bd2",
      link: "#268bd2",
      linkHover: "#1f6ea3",
      headingH1: "#b58900",
      headingH2: "#cb4b16",
      headingH3: "#859900",
      headingH4: "#2aa198",
      headingH5: "#268bd2",
      headingH6: "#6c71c4",
      bold: "#d33682",
    },
    dark: {
      bg: "#002b36",
      bgSecondary: "#073642",
      bgMuted: "rgba(147, 161, 161, 0.08)",
      bgEmphasis: "rgba(147, 161, 161, 0.14)",
      text: "#93a1a1",
      textMuted: "#586e75",
      textInverse: "#002b36",
      border: "rgba(147, 161, 161, 0.2)",
      accent: "#268bd2",
      link: "#2aa198",
      linkHover: "#6c71c4",
      headingH1: "#b58900",
      headingH2: "#cb4b16",
      headingH3: "#859900",
      headingH4: "#2aa198",
      headingH5: "#268bd2",
      headingH6: "#93a1a1",
      bold: "#d33682",
    },
  },
  "rose-pine": {
    light: {
      bg: "#faf4ed",
      bgSecondary: "#fffaf3",
      bgMuted: "rgba(87, 82, 121, 0.09)",
      bgEmphasis: "rgba(87, 82, 121, 0.15)",
      text: "#575279",
      textMuted: "#797593",
      textInverse: "#faf4ed",
      border: "rgba(87, 82, 121, 0.2)",
      accent: "#907aa9",
      link: "#286983",
      linkHover: "#56949f",
      headingH1: "#907aa9",
      headingH2: "#ea9d34",
      headingH3: "#56949f",
      headingH4: "#286983",
      headingH5: "#d7827e",
      headingH6: "#575279",
      bold: "#b4637a",
    },
    dark: {
      bg: "#191724",
      bgSecondary: "#1f1d2e",
      bgMuted: "rgba(224, 222, 244, 0.08)",
      bgEmphasis: "rgba(224, 222, 244, 0.14)",
      text: "#e0def4",
      textMuted: "#908caa",
      textInverse: "#191724",
      border: "rgba(224, 222, 244, 0.16)",
      accent: "#c4a7e7",
      link: "#9ccfd8",
      linkHover: "#c4a7e7",
      headingH1: "#c4a7e7",
      headingH2: "#f6c177",
      headingH3: "#9ccfd8",
      headingH4: "#ebbcba",
      headingH5: "#f6c177",
      headingH6: "#e0def4",
      bold: "#eb6f92",
    },
  },
  moonlight: {
    light: {
      bg: "#e6e9ef",
      bgSecondary: "#dce1ea",
      bgMuted: "rgba(47, 51, 77, 0.09)",
      bgEmphasis: "rgba(47, 51, 77, 0.15)",
      text: "#2f334d",
      textMuted: "#5c667a",
      textInverse: "#e6e9ef",
      border: "rgba(47, 51, 77, 0.2)",
      accent: "#4458b8",
      link: "#3e68d7",
      linkHover: "#2f55b5",
      headingH1: "#4458b8",
      headingH2: "#9a6f2f",
      headingH3: "#3e7a5a",
      headingH4: "#2f6f9f",
      headingH5: "#6d59a8",
      headingH6: "#4c587a",
      bold: "#c24b63",
    },
    dark: {
      bg: "#232436",
      bgSecondary: "#1e2030",
      bgMuted: "rgba(130, 170, 255, 0.08)",
      bgEmphasis: "rgba(130, 170, 255, 0.14)",
      text: "#c8d3f5",
      textMuted: "#758096",
      textInverse: "#232436",
      border: "rgba(55, 60, 92, 0.5)",
      accent: "#82aaff",
      link: "#82aaff",
      linkHover: "#c3e88d",
      headingH1: "#82aaff",
      headingH2: "#ffc777",
      headingH3: "#c3e88d",
      headingH4: "#86e1fc",
      headingH5: "#c099ff",
      headingH6: "#c8d3f5",
      bold: "#ff757f",
    },
  },
};

const themeVarMap: Record<keyof ThemeColors, string> = {
  bg: "--color-bg",
  bgSecondary: "--color-bg-secondary",
  bgMuted: "--color-bg-muted",
  bgEmphasis: "--color-bg-emphasis",
  text: "--color-text",
  textMuted: "--color-text-muted",
  textInverse: "--color-text-inverse",
  border: "--color-border",
  accent: "--color-accent",
  link: "--color-link",
  linkHover: "--color-link-hover",
  headingH1: "--color-heading-h1",
  headingH2: "--color-heading-h2",
  headingH3: "--color-heading-h3",
  headingH4: "--color-heading-h4",
  headingH5: "--color-heading-h5",
  headingH6: "--color-heading-h6",
  bold: "--color-bold",
};

function applyThemeColors(resolvedTheme: "light" | "dark", colors?: ThemeColors) {
  const root = document.documentElement;
  const defaults = resolvedTheme === "dark" ? defaultDarkColors : defaultLightColors;
  const active = { ...defaults, ...(colors || {}) };
  (Object.keys(themeVarMap) as Array<keyof ThemeColors>).forEach((key) => {
    root.style.setProperty(themeVarMap[key], active[key] || defaults[key]);
  });
}

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
  themePreset: ThemePreset;
  setThemePreset: (preset: Exclude<ThemePreset, "custom">) => void;
  customLightColors: ThemeColors;
  customDarkColors: ThemeColors;
  setCustomThemeColor: (
    mode: "light" | "dark",
    key: keyof ThemeColors,
    value: string
  ) => void;
  resetCustomThemeColors: () => void;
  cycleTheme: () => void;
  editorFontSettings: Required<EditorFontSettings>;
  setEditorFontSetting: <K extends keyof EditorFontSettings>(
    key: K,
    value: EditorFontSettings[K]
  ) => void;
  resetEditorFontSettings: () => void;
  reloadSettings: () => Promise<void>;
  textDirection: TextDirection;
  setTextDirection: (dir: TextDirection) => void;
  editorWidth: EditorWidth;
  setEditorWidth: (width: EditorWidth) => void;
  interfaceZoom: number;
  setInterfaceZoom: (zoomOrUpdater: number | ((prev: number) => number)) => void;
  customEditorWidthPx: number;
  setCustomEditorWidthPx: (px: number) => void;
  setEditorMaxWidthLive: (value: string) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

// Apply editor font CSS variables (with computed values)
function applyFontCSSVariables(fonts: Required<EditorFontSettings>) {
  const root = document.documentElement;
  const fontFamily = fontFamilyMap[fonts.baseFontFamily];
  const baseSize = fonts.baseFontSize;
  const boldWeight = fonts.boldWeight;
  const lineHeight = fonts.lineHeight;

  // Base font settings
  root.style.setProperty("--editor-font-family", fontFamily);
  root.style.setProperty("--editor-base-font-size", `${baseSize}px`);
  root.style.setProperty("--editor-bold-weight", String(boldWeight));
  root.style.setProperty("--editor-line-height", String(lineHeight));

  // Computed header sizes (based on base)
  root.style.setProperty("--editor-h1-size", `${baseSize * 2.25}px`);
  root.style.setProperty("--editor-h2-size", `${baseSize * 1.75}px`);
  root.style.setProperty("--editor-h3-size", `${baseSize * 1.5}px`);
  root.style.setProperty("--editor-h4-size", `${baseSize * 1.25}px`);
  root.style.setProperty("--editor-h5-size", `${baseSize}px`);
  root.style.setProperty("--editor-h6-size", `${baseSize}px`);

  // Fixed value for paragraph spacing
  root.style.setProperty("--editor-paragraph-spacing", "0.875em");
}

// Apply editor layout CSS variables
function applyLayoutCSSVariables(
  direction: TextDirection,
  width: EditorWidth,
  customWidthPx?: number
) {
  const root = document.documentElement;
  root.style.setProperty("--editor-direction", direction);
  if (width === "custom" && customWidthPx) {
    root.style.setProperty("--editor-max-width", `${customWidthPx}px`);
  } else if (width !== "custom") {
    root.style.setProperty("--editor-max-width", editorWidthMap[width]);
  }
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [themePreset, setThemePresetState] = useState<ThemePreset>("scratch");
  const [customLightColors, setCustomLightColors] =
    useState<ThemeColors>(defaultLightColors);
  const [customDarkColors, setCustomDarkColors] =
    useState<ThemeColors>(defaultDarkColors);
  const [editorFontSettings, setEditorFontSettings] = useState<
    Required<EditorFontSettings>
  >(defaultEditorFontSettings);
  const [textDirection, setTextDirectionState] = useState<TextDirection>("ltr");
  const [editorWidth, setEditorWidthState] = useState<EditorWidth>("normal");
  const [interfaceZoom, setInterfaceZoomState] = useState(1.0);
  const [customEditorWidthPx, setCustomEditorWidthPxState] = useState<number>(
    DEFAULT_CUSTOM_WIDTH_PX
  );
  const [isInitialized, setIsInitialized] = useState(false);

  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  // Function to load settings from backend
  const loadSettingsFromBackend = useCallback(async () => {
    try {
      const settings = await getSettings();
      if (settings.theme) {
        const mode = settings.theme.mode as ThemeMode;
        if (mode === "light" || mode === "dark" || mode === "system") {
          setThemeState(mode);
        }
        const preset = settings.theme.themePreset;
        if (
          preset === "scratch" ||
          preset === "catppuccin" ||
          preset === "tokyo-night" ||
          preset === "github" ||
          preset === "gruvbox-material" ||
          preset === "kanagawa" ||
          preset === "solarized" ||
          preset === "rose-pine" ||
          preset === "moonlight" ||
          preset === "custom"
        ) {
          setThemePresetState(preset);
        }
        setCustomLightColors(settings.theme.customLightColors || {});
        setCustomDarkColors(settings.theme.customDarkColors || {});
      }
      if (settings.editorFont) {
        // Filter out null/undefined values to preserve defaults
        const fontSettings = Object.fromEntries(
          Object.entries(settings.editorFont).filter(([, v]) => v != null)
        ) as Partial<EditorFontSettings>;
        setEditorFontSettings({
          ...defaultEditorFontSettings,
          ...fontSettings,
        });
      }
      if (settings.textDirection === "ltr" || settings.textDirection === "rtl") {
        setTextDirectionState(settings.textDirection);
      }
      if (
        settings.editorWidth === "normal" ||
        settings.editorWidth === "full" ||
        settings.editorWidth === "dynamic"
      ) {
        setEditorWidthState(settings.editorWidth);
      } else if (
        settings.editorWidth === "narrow" ||
        settings.editorWidth === "wide" ||
        settings.editorWidth === "custom"
      ) {
        // Migrate old width modes to the new 3-option model.
        setEditorWidthState("dynamic");
      }
      if (
        typeof settings.interfaceZoom === "number" &&
        settings.interfaceZoom >= 0.7 &&
        settings.interfaceZoom <= 1.5
      ) {
        setInterfaceZoomState(settings.interfaceZoom);
      }
      if (
        typeof settings.customEditorWidthPx === "number" &&
        settings.customEditorWidthPx >= 480
      ) {
        setCustomEditorWidthPxState(settings.customEditorWidthPx);
      }
    } catch {
      // If settings can't be loaded, use defaults
    }
  }, []);

  // Reload settings from backend (exposed to context consumers)
  const reloadSettings = useCallback(async () => {
    await loadSettingsFromBackend();
  }, [loadSettingsFromBackend]);

  // Load settings from backend on mount
  useEffect(() => {
    loadSettingsFromBackend().finally(() => {
      setIsInitialized(true);
    });
  }, [loadSettingsFromBackend]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Resolve the actual theme to use
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  // Apply theme to document (just toggle dark class)
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [resolvedTheme]);

  useEffect(() => {
    const colors = resolvedTheme === "dark" ? customDarkColors : customLightColors;
    applyThemeColors(resolvedTheme, colors);
  }, [resolvedTheme, customLightColors, customDarkColors]);

  // Save theme mode to backend
  const saveThemeSettings = useCallback(async (newThemeSettings: ThemeSettings) => {
    try {
      const settings = await getSettings();
      await updateSettings({
        ...settings,
        theme: newThemeSettings,
      });
    } catch (error) {
      console.error("Failed to save theme settings:", error);
    }
  }, []);

  const setTheme = useCallback(
    (newTheme: ThemeMode) => {
      setThemeState(newTheme);
      saveThemeSettings({
        mode: newTheme,
        customLightColors,
        customDarkColors,
        themePreset,
      });
    },
    [saveThemeSettings, customLightColors, customDarkColors, themePreset]
  );

  const setThemePreset = useCallback(
    async (preset: Exclude<ThemePreset, "custom">) => {
      const colors = themePresets[preset];
      setThemePresetState(preset);
      setCustomLightColors(colors.light);
      setCustomDarkColors(colors.dark);
      await saveThemeSettings({
        mode: theme,
        themePreset: preset,
        customLightColors: colors.light,
        customDarkColors: colors.dark,
      });
    },
    [saveThemeSettings, theme]
  );

  const setCustomThemeColor = useCallback(
    async (mode: "light" | "dark", key: keyof ThemeColors, value: string) => {
      const nextLight =
        mode === "light"
          ? { ...customLightColors, [key]: value }
          : customLightColors;
      const nextDark =
        mode === "dark"
          ? { ...customDarkColors, [key]: value }
          : customDarkColors;

      setThemePresetState("custom");
      setCustomLightColors(nextLight);
      setCustomDarkColors(nextDark);

      await saveThemeSettings({
        mode: theme,
        themePreset: "custom",
        customLightColors: nextLight,
        customDarkColors: nextDark,
      });
    },
    [customDarkColors, customLightColors, saveThemeSettings, theme]
  );

  const resetCustomThemeColors = useCallback(async () => {
    setThemePresetState("scratch");
    setCustomLightColors(themePresets.scratch.light);
    setCustomDarkColors(themePresets.scratch.dark);
    await saveThemeSettings({
      mode: theme,
      themePreset: "scratch",
      customLightColors: themePresets.scratch.light,
      customDarkColors: themePresets.scratch.dark,
    });
  }, [saveThemeSettings, theme]);

  const cycleTheme = useCallback(() => {
    const order: ThemeMode[] = ["light", "dark", "system"];
    const currentIndex = order.indexOf(theme);
    const nextIndex = (currentIndex + 1) % order.length;
    setTheme(order[nextIndex]);
  }, [theme, setTheme]);

  // Apply font CSS variables whenever font settings change
  useEffect(() => {
    applyFontCSSVariables(editorFontSettings);
  }, [editorFontSettings]);

  // Apply layout CSS variables whenever direction or width change
  useEffect(() => {
    applyLayoutCSSVariables(textDirection, editorWidth, customEditorWidthPx);
  }, [textDirection, editorWidth, customEditorWidthPx]);

  // Apply interface zoom whenever it changes (suppress transitions during zoom)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("zoom-no-transition");
    root.style.zoom = String(interfaceZoom);
    const raf = requestAnimationFrame(() => {
      root.classList.remove("zoom-no-transition");
    });
    return () => cancelAnimationFrame(raf);
  }, [interfaceZoom]);

  // Save font settings to backend
  const saveFontSettings = useCallback(
    async (newFontSettings: Required<EditorFontSettings>) => {
      try {
        const settings = await getSettings();
        await updateSettings({
          ...settings,
          editorFont: newFontSettings,
        });
      } catch (error) {
        console.error("Failed to save font settings:", error);
      }
    },
    []
  );

  // Update a single font setting
  const setEditorFontSetting = useCallback(
    <K extends keyof EditorFontSettings>(
      key: K,
      value: EditorFontSettings[K]
    ) => {
      setEditorFontSettings((prev) => {
        const updated = { ...prev, [key]: value };
        saveFontSettings(updated);
        return updated;
      });
    },
    [saveFontSettings]
  );

  // Reset font settings to defaults (single atomic save to avoid race conditions)
  const resetEditorFontSettings = useCallback(async () => {
    setEditorFontSettings(defaultEditorFontSettings);
    setTextDirectionState("ltr");
    setEditorWidthState("normal");
    setInterfaceZoomState(1.0);
    setCustomEditorWidthPxState(DEFAULT_CUSTOM_WIDTH_PX);
    try {
      const settings = await getSettings();
      await updateSettings({
        ...settings,
        editorFont: defaultEditorFontSettings,
        textDirection: "ltr",
        editorWidth: "normal",
        interfaceZoom: 1.0,
        customEditorWidthPx: undefined,
      });
    } catch (error) {
      console.error("Failed to reset editor settings:", error);
    }
  }, []);

  // Save and set text direction
  const setTextDirection = useCallback(async (dir: TextDirection) => {
    setTextDirectionState(dir);
    try {
      const settings = await getSettings();
      await updateSettings({ ...settings, textDirection: dir });
    } catch (error) {
      console.error("Failed to save text direction:", error);
    }
  }, []);

  // Save and set editor width
  const setEditorWidth = useCallback(async (width: EditorWidth) => {
    setEditorWidthState(width);
    try {
      const settings = await getSettings();
      await updateSettings({ ...settings, editorWidth: width });
    } catch (error) {
      console.error("Failed to save editor width:", error);
    }
  }, []);

  // Save and set interface zoom (accepts absolute value or updater function)
  const setInterfaceZoom = useCallback(
    (zoomOrUpdater: number | ((prev: number) => number)) => {
      setInterfaceZoomState((prev) => {
        const raw =
          typeof zoomOrUpdater === "function"
            ? zoomOrUpdater(prev)
            : zoomOrUpdater;
        return Math.round(Math.min(Math.max(raw, 0.7), 1.5) * 20) / 20;
      });
    },
    [],
  );

  // Persist interface zoom changes to backend
  useEffect(() => {
    if (!isInitialized) return;
    getSettings()
      .then((settings) =>
        updateSettings({ ...settings, interfaceZoom }),
      )
      .catch((error) =>
        console.error("Failed to save interface zoom:", error),
      );
  }, [interfaceZoom, isInitialized]);

  // Set custom width in px (persists to settings)
  const setCustomEditorWidthPx = useCallback(async (px: number) => {
    setEditorWidthState("custom");
    setCustomEditorWidthPxState(px);
    try {
      const settings = await getSettings();
      await updateSettings({
        ...settings,
        editorWidth: "custom",
        customEditorWidthPx: px,
      });
    } catch (error) {
      console.error("Failed to save custom editor width:", error);
    }
  }, []);

  // Live CSS variable update during drag (no persistence)
  const setEditorMaxWidthLive = useCallback((value: string) => {
    document.documentElement.style.setProperty("--editor-max-width", value);
  }, []);

  // Don't render until initialized to prevent flash
  if (!isInitialized) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        themePreset,
        setThemePreset,
        customLightColors,
        customDarkColors,
        setCustomThemeColor,
        resetCustomThemeColors,
        cycleTheme,
        editorFontSettings,
        setEditorFontSetting,
        resetEditorFontSettings,
        reloadSettings,
        textDirection,
        setTextDirection,
        editorWidth,
        setEditorWidth,
        interfaceZoom,
        setInterfaceZoom,
        customEditorWidthPx,
        setCustomEditorWidthPx,
        setEditorMaxWidthLive,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
