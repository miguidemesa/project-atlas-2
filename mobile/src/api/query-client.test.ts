import { onlineManager } from "@tanstack/react-query";
import { DAY, createQueryClient, persistOptions } from "./query-client";

afterEach(() => onlineManager.setOnline(true));

it("never pauses, queues or retries a mutation", () => {
  expect(createQueryClient().getDefaultOptions().mutations).toEqual({ networkMode: "always", retry: 0 });
});

it("fails a mutation at once while offline instead of pausing it to replay later", async () => {
  const client = createQueryClient();
  onlineManager.setOnline(false);
  const send = jest.fn(async () => {
    throw new TypeError("Network request failed");
  });

  const mutation = client.getMutationCache().build(client, { mutationFn: send });

  await expect(mutation.execute(undefined)).rejects.toThrow("Network request failed");
  expect(send).toHaveBeenCalledTimes(1);
  expect(mutation.state.isPaused).toBe(false);
});

it("saves reads for a day but never saves mutations", () => {
  expect(persistOptions.maxAge).toBe(DAY);
  expect(persistOptions.dehydrateOptions?.shouldDehydrateMutation?.({} as never)).toBe(false);
});
