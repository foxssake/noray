import { describe, it } from "node:test";
import assert from "node:assert";
import { requireEnum } from "../../src/assertions.ts";

describe("assertions", () => {
  describe("requireEnum", () => {
    const TestEnum = Object.freeze({
      Foo: "foo",
      Bar: "bar",
    });

    it("should return param", () => {
      // Given
      const expected = TestEnum.Bar;

      // When
      const actual = requireEnum(expected, TestEnum);

      // Then
      assert.equal(actual, expected);
    });

    it("should throw on invalid", () => {
      // Given
      const invalid = "@@$invalid$@@";

      // When + Then
      assert.throws(
        () => requireEnum(invalid, TestEnum),
        (err: Error) =>
          assert.equal(err.message, "Invalid enum value: " + invalid) ?? true,
      );
    });
  });
});
