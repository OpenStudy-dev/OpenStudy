/**
 * Build-time switches (Vite replaces these at build, so the unused branch
 * is dropped from the bundle).
 *
 * LANDING_ONLY — static marketing build (`pnpm build:landing`, deployed to
 * Cloudflare Pages for openstudy.dev): only the landing page is routed and
 * nothing talks to an API. Self-hosted builds leave it unset.
 */
export const LANDING_ONLY = import.meta.env.VITE_LANDING_ONLY === "true";
