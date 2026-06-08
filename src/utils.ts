import { randomInt } from "node:crypto";
import { type EventEmitter } from "node:events";
import words from "./wordlist.ts";

/**
 * Return current time ( seconds since epoch ).
 */
export function time(): number {
  return (performance.now() + performance.timeOrigin) / 1000;
}

/**
 * Sleep.
 */
export function sleep(seconds: number): Promise<void>;
export function sleep<T>(seconds: number, value: T): Promise<T>;
export function sleep<T>(seconds: number, value?: T): Promise<T | void> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(value), seconds * 1000),
  );
}

/**
 * Wait for an event on event source.
 */
export function promiseEvent<T = unknown>(
  source: EventEmitter,
  event: string,
): Promise<T> {
  return new Promise((resolve) => {
    source.on(event, resolve);
  });
}

/**
 * Wrap a function as a singleton factory.
 *
 * In practice, this will create a function that will cache the wrapped
 * function's return value, assuming it always returns the same thing.
 *
 * NOTE: This will evaluate the method while wrapping.
 */
export function asSingletonFactory<T>(f: () => T): () => T {
  const value = f();
  return () => value;
}

/**
 * Memoize function.
 *
 * That is, for every set of input arguments, remember the result. The next time
 * the same arguments are used, instead of calculating the result again, it will
 * be recovered from cache.
 *
 * NOTE: The cache is not limited in any way, use only in cases where
 * the possible number of parameters is limited.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function memoize(f: Function): Function {
  const cache = new Map();
  return function(...args: unknown[]) {
    const key = JSON.stringify(args);

    if (!cache.has(key)) {
      cache.set(key, f(...args));
    }

    return cache.get(key);
  };
}

/**
 * Maps an input array into chunks of a given size. The last chunk might be
 * smaller than the requested size.
 *
 * @param {T[]} data Data
 * @param {number} size Chunk size
 * @returns {T[][]} An array of chunks
 * @template T
 */
export function chunks<T>(data: T[], size: number): T[][] {
  const count = Math.ceil(data.length / size);
  return [...new Array(count)].map((_, i) =>
    data.slice(i * size, (i + 1) * size),
  );
}

/**
 * Symbol for timeout.
 */
export const Timeout = Symbol("timeout");

/**
 * Limit a promise run to a given timeout.
 *
 * If the promise doesn't resolve in time, the `Timeout` symbol will be returned.
 * Otherwise, the promise's result will be passed through.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutSeconds: number,
): Promise<T | typeof Timeout> {
  return Promise.race([sleep(timeoutSeconds, Timeout), promise]);
}

/**
 * Generate an array of numbers 0..n
 */
export function range(n: number): number[] {
  return [...new Array(Math.max(~~n, 0))].map((_, i) => i);
}

/**
 * Generate all possible combinations of the values in the given arrays.
 *
 * For example:
 * ```js
 * console.log(['a', 'b'], [0, 1], [true, false])
 * // ['a', 0, true]
 * // ['a', 0, false]
 * // ['a', 1, true]
 * // ['a', 1, false]
 * // ['b', 0, true]
 * // ['b', 0, false]
 * // ['b', 1, true]
 * // ['b', 1, false]
 * ```
 * @param {...Array<T>} arrays Arrays to combine
 * @returns {Array<Array<T>>} Array of combinations
 * @template T
 */
export function combine(...arrays: unknown[][]): unknown[][] {
  const count = arrays.map((a) => a.length).reduce((a, b) => a * b, 1);
  const dimensions = arrays.length;

  const result = range(count).map(() => new Array(dimensions));

  for (let i = 0; i < count; ++i) {
    const item = new Array(dimensions);
    let idx = i;

    for (let d = 0; d < dimensions; ++d) {
      const divisor = arrays[d].length;
      item[d] = arrays[d][idx % divisor];
      idx = ~~(idx / divisor);
    }

    result[i] = item;
  }

  return result;
}

/**
 * Format a size in bytes to a human readable form.
 *
 * For example, 131072 becomes 128kb.
 */
export function formatByteSize(size: number): string {
  const postfixes = ["b", "kb", "Mb", "Gb", "Tb", "Pb", "Eb", "Zb", "Yb"];
  const pfi =
    (postfixes.length +
      postfixes.findIndex((_, i) => size < Math.pow(1024, i + 1))) %
    postfixes.length;

  return size / Math.pow(1024, pfi) + postfixes[pfi];
}

/**
 * Format bandwidth in bytes/ec to a human readable form.
 *
 * E.g. 3072 becomes 3kbps
 */
export function formatBandwidth(bandwidth: number): string {
  // TODO: Extract shared logic
  const postfixes = [
    "bps",
    "kbps",
    "Mbps",
    "Gbps",
    "Tbps",
    "Pbps",
    "Ebps",
    "Zbps",
    "Ybps",
  ];
  const pfi =
    (postfixes.length +
      postfixes.findIndex((_, i) => bandwidth < Math.pow(1024, i + 1))) %
    postfixes.length;

  return bandwidth / Math.pow(1024, pfi) + postfixes[pfi];
}

/**
 * Format a duration to a human readable form.
 *
 * For example, 720 becomes 12min.
 */
export function formatDuration(seconds: number): string {
  const units = Object.entries({
    us: 0.000001,
    ms: 0.001,
    sec: 1,
    min: 60,
    hr: 3600,
    day: 86400,
    wk: 604800,
    mo: 2592000,
    yr: 31536000,
  }).reverse();

  const [unit, multiplier] =
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    units.find(([_, f]) => seconds > f) ?? units.at(-1)!;

  return seconds / multiplier + unit;
}

/**
 * Select random words from wordlist.
 *
 * Used to generate a word based OID For example, FalconTimberYolk
 */
export function generateWordId(wordCount = 3): string {
  return range(wordCount)
    .map(() => words[randomInt(words.length)])
    .join("");
}

export type ErrorProvider = () => Error;

export function required<T>(
  what: T | undefined | null,
  errorProvider: ErrorProvider = () => new Error("Undefined value!"),
): T {
  if (what === null || what === undefined) throw errorProvider();
  else return what;
}
