import { expect, describe, test } from "bun:test";
import {
  boolean,
  byteSize,
  duration,
  enumerated,
  integer,
  number,
  ports,
} from "../../src/config.parsers.ts";

describe("boolean", () => {
  const cases = [
    ["should parse true", "true", true],
    ["should parse false", "false", false],
    ["should parse any word", "foo", false],
    ["should return undefined on undefined", undefined, undefined],
  ] as [string, string | undefined, boolean | undefined][];

  cases.forEach(([name, input, expected]) =>
    test(name, () => {
      expect(boolean(input)).toBe(expected);
    }),
  );
});

describe("integer", () => {
  const cases = [
    ["should parse valid", "42", 42],
    ["should return undefined on invalid", "asd", undefined],
    ["should return undefined on empty", "", undefined],
    ["should return undefined on undefined", undefined, undefined],
  ] as [string, string | undefined, number | undefined][];

  cases.forEach(([name, input, expected]) =>
    test(name, () => {
      expect(integer(input)).toBe(expected);
    }),
  );
});

describe("number", () => {
  const cases = [
    ["should parse valid integer", "42", 42],
    ["should parse valid number", "420.69", 420.69],
    ["should return undefined on invalid", "asd", undefined],
    ["should return undefined on empty", "", undefined],
    ["should return undefined on undefined", undefined, undefined],
  ] as [string, string | undefined, number | undefined][];

  cases.forEach(([name, input, expected]) =>
    test(name, () => {
      expect(number(input)).toBe(expected);
    }),
  );
});

describe("enumerated", () => {
  const cases = [
    ["should return known", ["a", ["a", "b", "c"]], "a"],
    ["should return undefined on unknown", ["f", ["a", "b"]], undefined],
    ["should return undefined on empty", ["", ["a", "b"]], undefined],
    ["should return undefined on undefined", [undefined, ["a"]], undefined],
  ] as [string, [string | undefined, string[]], string | undefined][];

  cases.forEach(([name, [input, known], expected]) =>
    test(name, () => {
      expect(enumerated(input, known)).toBe(expected);
    }),
  );
});

describe("byteSize", () => {
  const validCases = [
    ["should pass through undefined", undefined, undefined],
    ["should parse without postfix", "64", 64],
    ["should parse kb", "64kb", 64 * 1024],
    ["should parse Mb", "64Mb", 64 * Math.pow(1024, 2)],
    ["should parse Gb", "64Gb", 64 * Math.pow(1024, 3)],
    ["should parse Gb", "64Tb", 64 * Math.pow(1024, 4)],
    ["should parse Pb", "6.4Pb", 6.4 * Math.pow(1024, 5)],
    ["should parse Eb", "6.4Eb", 6.4 * Math.pow(1024, 6)],
    ["should parse Zb", "64Zb", 64 * Math.pow(1024, 7)],
    ["should parse Yb", "64Yb", 64 * Math.pow(1024, 8)],
  ] as [string, string | undefined, number][];

  const throwCases = [
    ["should throw on invalid format", "no6"],
    ["should throw on invalid postfix", "64Bb"],
  ] as [string, string][];

  validCases.forEach(([name, input, expected]) =>
    test(name, () => expect(byteSize(input)).toBe(expected)),
  );

  throwCases.forEach(([name, input]) =>
    test(name, () => expect(() => byteSize(input)).toThrow()),
  );
});

describe("duration", () => {
  const validCases = [
    ["should pass through undefined", undefined, undefined],
    ["should parse without postfix", "64", 64],
    ["should parse usec", "64us", 0.000064],
    ["should parse msec", "64ms", 0.064],
    ["should parse sec", "64s", 64],
    ["should parse minute", "10m", 600],
    ["should parse hour", "4h", 14400],
    ["should parse hour", "4hr", 14400],
    ["should parse day", "2d", 172800],
    ["should parse week", "2w", 1209600],
    ["should parse month", "3mo", 7776000],
    ["should parse year", "4yr", 126144000],
  ] as [string, string | undefined, number | undefined][];

  const throwCases = [
    ["should throw on invalid format", "no6"],
    ["should throw on invalid postfix", "64mh"],
  ] as [string, string][];

  validCases.forEach(([name, input, expected]) =>
    test(name, () => expect(duration(input)).toBe(expected)),
  );

  throwCases.forEach(([name, input]) =>
    test(name, () => expect(() => duration(input)).toThrow()),
  );
});

describe("ports", () => {
  const cases = [
    ["should parse literal", "1024", [1024]],
    ["should parse absolute", "1024-1026", [1024, 1025, 1026]],
    ["should parse relative", "2048+3", [2048, 2049, 2050, 2051]],
    ["should parse single absolute", "1024-1024", [1024]],
    ["should parse single relative", "1024+0", [1024]],
    ["should return sorted", "2048+1, 1024-1025", [1024, 1025, 2048, 2049]],
    ["should return unique", "1-4, 2, 2-6", [1, 2, 3, 4, 5, 6]],
  ] as [string, string | undefined, number[]][];

  cases.forEach(([name, input, expected]) =>
    test(name, () => expect(ports(input)).toEqual(expected)),
  );
});
