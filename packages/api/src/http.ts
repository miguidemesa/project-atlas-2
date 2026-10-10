/** A failed API call: the HTTP status and the server's { "error" } message. */
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
export function apiUrl(baseUrl: string, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl.replace(/\/+$/, "")}${clean.startsWith("/api/") ? clean : `/api${clean}`}`;
}

/** Unwraps { data }, or throws the server's { error } as an ApiError. A 204 resolves to undefined. */
export async function readData<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as { data?: T; error?: string } | null;
  if (!res.ok) throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`);
  return body?.data as T;
}
