import { ApiError } from "@atlas/api";

/** The first message for each field, from a zod error's issues. */
export function fieldErrors(issues: readonly { path: readonly PropertyKey[]; message: string }[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0]);
    errors[field] ??= issue.message;
  }
  return errors;
}

/** What to tell the person when a request fails: the API's own message, or a connection problem. */
export function problem(err: unknown): string {
  return err instanceof ApiError ? err.message : "Couldn't reach Atlas. Check your connection and try again.";
}
