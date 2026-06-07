import assert from "node:assert";

/**
 * Parse config value as boolean.
 */
export function boolean(value: string | undefined): boolean | undefined {
  return value !== undefined ? value === "true" : undefined;
}

/**
 * Parse config value as integer.
 */
export function integer(value: string | undefined): number | undefined {
  const result = parseInt(value ?? "", 10);
  return Number.isNaN(result) ? undefined : result;
}

/**
 * Parse config value as number
 */
export function number(value: string | undefined): number | undefined {
  const result = parseFloat(value ?? "");
  return Number.isNaN(result) ? undefined : result;
}

/**
 * Parse config value as enum.
 *
 * @param value Value
 * @param values Allowed values
 * @returns Allowed value or undefined
 */
export function enumerated<T>(value: T, values: readonly T[]): T | undefined {
  return values.includes(value) ? value : undefined;
}

/**
 * Split an input into nominator and unit
 */
function extractUnit(value: string): [string, string] {
  const pattern = /^([0-9.,]+)([a-zA-Z]*)/;

  const groups = pattern.exec(value);
  assert(groups, `Can't parse input "${value}"`);

  return [groups[1], groups[2]];
}

/**
 * Parse config value as human-readable size
 */
export function byteSize(value: string | undefined): number | undefined {
  if (value === undefined) {
    return value;
  }

  const postfixes = [
    "b",
    "kb",
    "mb",
    "gb",
    "tb",
    "pb",
    "eb",
    "zb",
    "yb",
    "bps",
    "kbps",
    "mbps",
    "gbps",
    "tbps",
    "pbps",
    "ebps",
    "zbps",
    "ybps",
  ];

  const [nominator, unit] = extractUnit(value);
  const nominated = number(nominator);

  const idx = postfixes.findIndex((pf) => pf === (unit || "b").toLowerCase());
  assert(idx >= 0, `Unknown byte postfix "${unit}"!`);

  return nominated !== undefined ? nominated * 1024 ** idx : undefined;
}

/**
 * Parse config value as human-readable duration
 */
export function duration(value: string | undefined): number | undefined {
  if (value === undefined) {
    return value;
  }

  const units: Record<string, number> = {
    "": 1,
    us: 0.000001,
    ms: 0.001,
    s: 1,
    m: 60,
    h: 3600,
    hr: 3600,
    d: 86400,
    w: 604800,
    mo: 2592000,
    yr: 31536000,
  };

  const [nominator, unit] = extractUnit(value.toLowerCase());
  const nominated = number(nominator);
  assert(units[unit], `Unknown duration unit "${unit}"!`);

  return nominated !== undefined ? nominated * units[unit] : undefined;
}

/**
 * Parse config value as port ranges.
 *
 * Three kinds of port ranges are parsed:
 * 1. literal - e.g. '1007' becomes [1007]
 * 2. absolute - e.g. '1024-1026' becomes [1024, 1025, 1026]
 * 3. relative - e.g. '1024+2' becomes [1024, 1025, 1026]
 *
 * These ranges are separated by a comma, e.g.:
 * `1007, 1024-1026, 2048+2`
 *
 * @param value Value
 * @returns Ports
 */
export function ports(value: string | undefined): number[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  const ranges = value.split(",").map((r) => r.trim());

  const literals = ranges
    .filter((p) => /^\d+$/.test(p))
    .map(integer)
    .filter((p) => p !== undefined)
    .map((p) => [p, p]);

  const absolutes: [number, number][] = ranges
    .filter((r) => r.includes("-"))
    .map((r) => r.split("-"))
    .map(([from, to]) => [integer(from), integer(to)] as [number, number])
    .filter(([from, to]) => from !== undefined && to !== undefined);

  const relatives = ranges
    .filter((r) => r.includes("+"))
    .map((r) => r.split("+").map(integer))
    .map(([from, offset]) =>
      from !== undefined && offset !== undefined
        ? [from, from + offset]
        : undefined,
    )
    .filter((it) => it !== undefined);

  const result = [...literals, ...absolutes, ...relatives]
    .flatMap(([from, to]) =>
      [...new Array(to - from + 1)].map((_, i) => from + i),
    )
    .sort()
    .filter((v, i, a) => i === 0 || v !== a[i - 1]); // ensure every port is unique

  return result.length > 0 ? result : undefined;
}
