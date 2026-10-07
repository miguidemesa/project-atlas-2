const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5080";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Absolute URL for an API path. Every route lives under /api, added here exactly once. */
export function apiUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${clean.startsWith("/api/") ? clean : `/api${clean}`}`;
}

/** GET and unwrap `{ data }`. Throws on any failure and never returns stand-in data. */
export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), { ...init, headers: { Accept: "application/json", ...init?.headers } });
  const body = (await res.json().catch(() => null)) as { data?: T; error?: string } | null;
  if (!res.ok) throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`);
  return body?.data as T;
}

/** Like apiGet, but a 404 resolves to null (a deleted listing, an unknown seller). */
export async function apiGetOrNull<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    return await apiGet<T>(path, init);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
