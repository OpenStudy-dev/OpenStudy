/**
 * Sanitise a post-login `?next=` target.
 *
 * The value comes straight from the URL, so anyone can craft a real
 * openstudy login link that bounces the user to another site afterwards.
 * Only same-origin paths are allowed: protocol-relative (`//evil.com`),
 * backslash variants (`/\evil.com`, which browsers treat as `//`),
 * absolute URLs, `javascript:` and control characters all fall back.
 */
export function safeNext(raw: string | null | undefined, origin: string, fallback = "/app"): string {
  if (!raw) return fallback;
  // eslint-disable-next-line no-control-regex
  if (!raw.startsWith("/") || raw.includes("\\") || /[\u0000-\u001f\u007f]/.test(raw)) {
    return fallback;
  }
  if (raw.startsWith("//")) return fallback;
  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return fallback;
  }
  if (url.origin !== new URL(origin).origin) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
