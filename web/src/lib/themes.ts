import type { ThemeId } from "@/data/types";

export type ThemeMeta = {
  id: ThemeId;
  label: string;
  tagline: string;
};

export const THEMES: ThemeMeta[] = [
  {
    id: "terminal",
    label: "Terminal",
    tagline: "Mono everywhere, teal-on-black, hacker cockpit.",
  },
  {
    id: "zine",
    label: "Zine",
    tagline: "Pastel cream + pink/cyan/yellow stickers, hand-drawn feel.",
  },
  {
    id: "library",
    label: "Library",
    tagline: "Cream paper, sepia type, card-catalog aesthetic.",
  },
  {
    id: "swiss",
    label: "Swiss",
    tagline: "12-column grid, red accent, Helvetica-era Swiss typography.",
  },
  {
    id: "editorial",
    label: "Generic",
    tagline: "The default Claude look — serif, airy, muted.",
  },
];

export const DEFAULT_THEME: ThemeId = "zine";

export function normalizeTheme(raw: string | null | undefined): ThemeId {
  if (!raw) return DEFAULT_THEME;
  return (THEMES.find((t) => t.id === raw)?.id ?? DEFAULT_THEME) as ThemeId;
}

const STORAGE_KEY = "openstudy:theme";

export function readStoredTheme(): ThemeId | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeTheme(raw);
  } catch {
    return null;
  }
}

export function applyTheme(raw: string | null | undefined): void {
  if (typeof document === "undefined") return;
  // Prefer the explicit value; fall back to whatever the browser last saw so
  // reloads don't reset to Editorial while the API round-trip catches up.
  const id = normalizeTheme(raw ?? readStoredTheme() ?? undefined);
  document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore quota / privacy-mode failures */
  }
}
