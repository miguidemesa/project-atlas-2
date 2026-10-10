export type Reply = readonly [status: number, body?: unknown];

export interface FakeCall {
  method: string;
  path: string;
  body: unknown;
  authorization: string | null;
}

/**
 * Replaces fetch with a fake Atlas API for one test. Keys are "METHOD /api/path?query"; a function reply
 * sees the call. Anything else answers 404, so a test notices requests it didn't expect.
 */
export function fakeApi(routes: Record<string, Reply | ((call: FakeCall) => Reply)>): FakeCall[] {
  const calls: FakeCall[] = [];
  global.fetch = jest.fn(async (url: string, init: RequestInit = {}) => {
    const call: FakeCall = {
      method: init.method ?? "GET",
      path: url.replace(/^https?:\/\/[^/]+/, ""),
      body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
      authorization: new Headers(init.headers).get("Authorization"),
    };
    calls.push(call);
    const route = routes[`${call.method} ${call.path}`];
    const [status, body] = typeof route === "function" ? route(call) : (route ?? [404, { error: "Not found." }]);
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }) as unknown as typeof fetch;
  return calls;
}

/** Makes every request fail the way fetch does with no connection. */
export function goOffline(): void {
  global.fetch = jest.fn(async () => {
    throw new TypeError("Network request failed");
  }) as unknown as typeof fetch;
}
