import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import sinon from "sinon";
import {
  Timeout,
  combine,
  formatBandwidth,
  formatByteSize,
  formatDuration,
  memoize,
  range,
  sleep,
  withTimeout,
} from "../../src/utils.ts";

describe("utils", () => {
  describe("memoized", () => {
    test("should not call again with same params", () => {
      // Given
      const expected = 4;
      const fn = sinon.mock();
      fn.returns(expected);

      const mfn = memoize(fn);

      // When
      mfn(16);
      const actual = mfn(16);

      // Then
      expect(actual).toBe(expected);
      expect(fn.calledOnce).toBeTrue();
      expect(fn.calledOnceWith(16)).toBeTrue();
    });

    test("should call through on unknown", () => {
      // Given
      const fn = sinon.mock();
      fn.twice().returns(undefined);
      const mfn = memoize(fn);

      // When
      mfn(16);
      mfn(32);

      // Then
      expect(fn.calledTwice).toBeTrue();
      expect(fn.calledWith(16)).toBeTrue();
      expect(fn.calledWith(32)).toBeTrue();
    });
  });

  describe("withTimeout", () => {
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
    });

    test("should return on resolve", async () => {
      // Given
      const expected = 42;
      const promise = Promise.resolve(expected);

      // When
      const actual = await withTimeout(promise, 8);

      // Then
      expect(actual).toBe(expected);
    });

    test("should throw on reject", () => {
      expect(() => withTimeout(Promise.reject(), 8)).toThrow();
    });

    test("should return symbol on timeout", async () => {
      // Given
      const promise = sleep(16);

      // When
      const actual = withTimeout(promise, 8);

      // Then
      clock.tick(16100);
      expect(await actual).toBe(Timeout);
    });

    afterEach(() => {
      clock.restore();
    });
  });

  describe("range", () => {
    test("should return numbers", () => {
      // Given
      const expected = [0, 1, 2, 3];

      // When
      const actual = range(4);

      // Then
      expect(actual).toEqual(expected);
    });

    test("should return empty on 0", () => {
      // Given
      const expected = [] as number[];

      // When
      const actual = range(0);

      // Then
      expect(actual).toEqual(expected);
    });

    test("should return empty on negative", () => {
      // Given
      const expected = [] as number[];

      // When
      const actual = range(-4);

      // Then
      expect(actual).toEqual(expected);
    });
  });

  describe("combine", () => {
    test("should return expected", () => {
      // Given
      const arrays = [
        ["a", "b"],
        [0, 1],
        ["foo", "bar"],
      ];

      const expected = [
        ["a", 0, "foo"],
        ["a", 0, "bar"],
        ["a", 1, "foo"],
        ["a", 1, "bar"],
        ["b", 0, "foo"],
        ["b", 0, "bar"],
        ["b", 1, "foo"],
        ["b", 1, "bar"],
      ];

      // When
      const actual = combine(...arrays);

      // Then
      // Compare sorted, since order doesn't matter
      expect(actual.sort()).toEqual(expected.sort());
    });
  });

  describe("formatByteSize", () => {
    const cases = [
      [128 * Math.pow(1024, 0), "128b"],
      [128 * Math.pow(1024, 1), "128kb"],
      [128 * Math.pow(1024, 2), "128Mb"],
      [128 * Math.pow(1024, 3), "128Gb"],
      [128 * Math.pow(1024, 4), "128Tb"],
      [128 * Math.pow(1024, 5), "128Pb"],
      [128 * Math.pow(1024, 6), "128Eb"],
      [128 * Math.pow(1024, 7), "128Zb"],
      [128 * Math.pow(1024, 8), "128Yb"],
      [8 * Math.pow(1024, 9), "8192Yb"],
    ] as [number, string][];

    cases.forEach(([input, expected]) =>
      test(`should format ${expected}`, () =>
        expect(formatByteSize(input)).toBe(expected)),
    );
  });

  describe("formatBandwidth", () => {
    const cases = [
      [128 * Math.pow(1024, 0), "128bps"],
      [128 * Math.pow(1024, 1), "128kbps"],
      [128 * Math.pow(1024, 2), "128Mbps"],
      [128 * Math.pow(1024, 3), "128Gbps"],
      [128 * Math.pow(1024, 4), "128Tbps"],
      [128 * Math.pow(1024, 5), "128Pbps"],
      [128 * Math.pow(1024, 6), "128Ebps"],
      [128 * Math.pow(1024, 7), "128Zbps"],
      [128 * Math.pow(1024, 8), "128Ybps"],
      [8 * Math.pow(1024, 9), "8192Ybps"],
    ] as [number, string][];

    cases.forEach(([input, expected]) =>
      test(`should format ${expected}`, () =>
        expect(formatBandwidth(input)).toBe(expected)),
    );
  });

  describe("formatDuration", () => {
    const cases = [
      [0.0000002, "0.2us"],
      [0.000002, "2us"],
      [0.002, "2ms"],
      [2, "2sec"],
      [120, "2min"],
      [7200, "2hr"],
      [172800, "2day"],
      [1814400, "3wk"],
      [10368000, "4mo"],
      [378432000, "12yr"],
    ] as [number, string][];

    cases.forEach(([input, expected]) =>
      test(`should format ${expected}`, () =>
        expect(formatDuration(input)).toBe(expected)),
    );
  });
});
