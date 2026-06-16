export class AssertionError extends Error { }

export function assert(
  what: unknown | undefined,
  message = "Assertion failed!",
): asserts what {
  if (what === undefined) throw new AssertionError(message);
}

export function fail(message = "Assertion failed!"): never {
  throw new AssertionError(message);
}
