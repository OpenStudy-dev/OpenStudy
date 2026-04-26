/**
 * Keep <title> and <html lang> in sync with the current route and i18n locale.
 *
 * - useDocumentTitle(): set "Page — SiteName" from the current pathname + i18n.
 * - useHtmlLang():      mirror i18n.language onto <html lang="…">.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const SITE_NAME = import.meta.env.VITE_SITE_NAME ?? "OpenStudy";

const TITLES: Record<string, { en: string; de: string }> = {
  "/app": { en: "Today", de: "Heute" },
  "/app/courses": { en: "Courses", de: "Kurse" },
  "/app/tasks": { en: "Tasks", de: "Aufgaben" },
  "/app/deliverables": { en: "Deliverables", de: "Abgaben" },
  "/app/exams": { en: "Exams", de: "Prüfungen" },
  "/app/files": { en: "Files", de: "Dateien" },
  "/app/activity": { en: "Activity", de: "Aktivität" },
  "/app/settings": { en: "Settings", de: "Einstellungen" },
  "/login": { en: "Sign in", de: "Anmelden" },
};

function resolveTitle(pathname: string, lang: "en" | "de"): string | null {
  const hit = TITLES[pathname];
  if (hit) return hit[lang];
  const courseMatch = pathname.match(/^\/app\/courses\/([^/]+)$/);
  if (courseMatch) return courseMatch[1].toUpperCase();
  return null;
}

// Routes that are part of the public surface Google should index. Everything
// else (the authed dashboard, the login page) gets `noindex, nofollow` so it
// doesn't end up in search results — Google would otherwise pick the auth
// redirect target as the canonical URL when crawling /, which is what
// produced "Sign in — OpenStudy" in early indexing.
const PUBLIC_PATHS = new Set<string>(["/", "/de"]);

export function useDocumentTitle(): void {
  const location = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    const lang = i18n.language === "de" ? "de" : "en";
    const page = resolveTitle(location.pathname, lang);
    document.title = page ? `${page} — ${SITE_NAME}` : SITE_NAME;

    const robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (robots) {
      robots.content = PUBLIC_PATHS.has(location.pathname)
        ? "index, follow, max-image-preview:large"
        : "noindex, nofollow";
    }
  }, [location.pathname, i18n.language]);
}

export function useHtmlLang(): void {
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = i18n.language === "de" ? "de" : "en";
  }, [i18n.language]);
}
