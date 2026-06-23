// UI-only settings (accessibility + HUD). Persisted in localStorage; NEVER part
// of the gamification save — clearing it only affects presentation.

export type ThemeMode = "dark" | "light";

export interface SovereignSettings {
  theme: ThemeMode; // dark (default) | light
  uiScale: number; // 0.8 – 2.0
  reduceMotion: boolean;
  compactHud: boolean;
  colorblind: boolean;
  highContrast: boolean;
  celebration: "full" | "subtle" | "off";
  goldFlash: boolean;
}

export const DEFAULT_SETTINGS: SovereignSettings = {
  theme: "dark",
  uiScale: 1,
  reduceMotion: false,
  compactHud: false,
  colorblind: false,
  highContrast: false,
  celebration: "full",
  goldFlash: true,
};

const KEY = "sovereign:settings";

export function loadSettings(): SovereignSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<SovereignSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: SovereignSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** Apply settings to the document root (CSS vars + data attributes). */
export function applySettings(s: SovereignSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = s.theme === "light" ? "light" : "";
  root.style.colorScheme = s.theme === "light" ? "light" : "dark";
  root.style.setProperty("--ui-scale", String(s.uiScale));
  root.dataset.reduceMotion = s.reduceMotion ? "true" : "";
  root.dataset.contrast = s.highContrast ? "high" : "";
  root.dataset.colorblind = s.colorblind ? "true" : "";
}
