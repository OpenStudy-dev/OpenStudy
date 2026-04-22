/**
 * i18n bootstrap — English + German.
 *
 * The language is derived from the user's saved `locale` in app_settings
 * (the Date-format dropdown in Settings). `de-*` maps to German; every
 * other locale falls through to English. On first render we use whatever
 * is in localStorage (saved by AppShell) so there's no flash of English.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import de from "@/locales/de.json";

export type AppLanguage = "en" | "de";

const LS_KEY = "openstudy:lang";

export function languageFromLocale(locale: string | null | undefined): AppLanguage {
  if (!locale) return "en";
  return locale.toLowerCase().startsWith("de") ? "de" : "en";
}

function readInitial(): AppLanguage {
  if (typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(LS_KEY);
    if (raw === "de" || raw === "en") return raw;
  }
  if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("de")) {
    return "de";
  }
  return "en";
}

export function currentLanguage(): AppLanguage {
  return (i18n.language === "de" ? "de" : "en");
}

/** Explicit user choice set via the picker. If true, the auto-sync from
 * settings.locale is ignored — the user's pick wins until they change it. */
const MANUAL_KEY = "openstudy:lang-manual";
export function hasExplicitLanguage(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(MANUAL_KEY) === "1";
}
export function markLanguageExplicit(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(MANUAL_KEY, "1");
}

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
    },
    lng: readInitial(),
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    returnEmptyString: false,
  });

export function setLanguage(lang: AppLanguage): void {
  if (i18n.language === lang) return;
  void i18n.changeLanguage(lang);
  try {
    localStorage.setItem(LS_KEY, lang);
  } catch {
    /* ignore */
  }
}

export default i18n;
