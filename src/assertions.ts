import { fail } from "node:assert";

/**
 * Ensure param is a valid enum value.
 *
 * The `enumDef` must have a value that is equal to `value`.
 *
 * @throws on invalid `value`
 */
export function requireEnum<T>(
  value: T,
  enumDef: Readonly<Record<string | number, T>>,
): T;
export function requireEnum<T>(
  value: T,
  enumDef: Record<string | number, T>,
): T {
  return Object.values(enumDef).includes(value)
    ? value
    : fail("Invalid enum value: " + value);
}
