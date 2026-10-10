import { createQueryClient } from "./query-client";

it("never pauses, queues or retries a mutation", () => {
  expect(createQueryClient().getDefaultOptions().mutations).toEqual({ networkMode: "always", retry: 0 });
});
