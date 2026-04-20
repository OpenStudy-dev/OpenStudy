/**
 * Tiny fetch wrapper. Always sends cookies (same-origin or configured API).
 * On 401 we dispatch a custom event so the router can redirect to /login.
 */

const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
// Strip trailing slash; if empty, we'll use relative paths (good for prod with same-origin /api)
export const API_BASE = RAW_BASE.replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown, message: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

export type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE}${p}`;
  if (!query) return url;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    usp.set(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const { body, query, headers, ...rest } = opts;
  const init: RequestInit = {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(headers ?? {}),
    },
    ...rest,
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  const res = await fetch(buildUrl(path, query), init);

  if (res.status === 401) {
    // Bubble up a global event; AppShell listens and redirects.
    window.dispatchEvent(new CustomEvent("api:unauthenticated"));
  }

  if (res.status === 204) return undefined as T;

  let data: unknown;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const detail = (data && typeof data === "object" && "detail" in data)
      ? (data as { detail: unknown }).detail
      : data;
    const message =
      typeof detail === "string"
        ? detail
        : `${res.status} ${res.statusText}`;
    throw new ApiError(res.status, detail, message);
  }

  return data as T;
}

export const api = {
  get: <T = unknown>(path: string, query?: RequestOptions["query"]) =>
    apiFetch<T>(path, { method: "GET", query }),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body }),
  del: <T = unknown>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
