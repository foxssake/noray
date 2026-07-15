import { describe, test, expect } from "bun:test";
import {
  IdInUseError,
  Repository,
  UnknownItemError,
} from "../../src/repository.ts";

interface TestItem {
  id: number;
  value: string;
}

function makeRepository() {
  return new Repository<TestItem, number>((it) => it.id!);
}

describe("Repository", () => {
  describe("add", () => {
    test("should add item", () => {
      // Given
      const repository = makeRepository();
      const expected = { id: 0, value: "foo" } as TestItem;

      // When
      const actual = repository.add(expected);

      // Then
      expect(actual).toEqual(expected);
      expect([...repository.list()].length).toBe(1);
    });

    test("should reject items with same id", () => {
      // Given
      const repository = makeRepository();
      const item = { id: 0, value: "foo" } as TestItem;
      const duplicate = { id: 0, value: "bar" } as TestItem;

      repository.add(item);

      // When + then
      expect(() => repository.add(duplicate)).toThrow(IdInUseError);
    });
  });

  describe("update", () => {
    test("should update item", () => {
      // Given
      const repository = makeRepository();
      const update = { id: 0, value: "bar" } as TestItem;
      repository.add({ id: 0, value: "foo" });

      // When
      repository.update(update);

      // Then
      const actual = repository.find(update.id);
      expect(actual).toEqual(update);
    });

    test("should reject unknown item", () => {
      // Given
      const repository = makeRepository();
      const update = { id: 0, value: "bar" } as TestItem;

      // When + then
      expect(() => repository.update(update)).toThrow(UnknownItemError);
    });
  });

  describe("find", () => {
    test("should return known item", () => {
      // Given
      const repository = makeRepository();
      const expected = { id: 0, value: "foo" } as TestItem;
      repository.add(expected);

      // When
      const actual = repository.find(expected.id);

      // Then
      expect(actual).toEqual(expected);
    });

    test("should return undefined on unknown", () => {
      // Given
      const repository = makeRepository();

      // When
      const actual = repository.find(0);

      // Then
      expect(actual).toBe(undefined);
    });
  });

  describe("has", () => {
    test("should return true on known", () => {
      // Given
      const repository = makeRepository();
      const item = { id: 0, value: "foo" } as TestItem;
      repository.add(item);

      // When
      const result = repository.has(item.id);

      // Then
      expect(result).toBeTrue();
    });

    test("should return false on unknown", () => {
      // Given
      const repository = makeRepository();
      const item = { id: 0, value: "foo" } as TestItem;

      // When
      const result = repository.has(item.id);

      // Then
      expect(!result).toBeTrue();
    });
  });

  describe("list", () => {
    test("should return empty", () => {
      // Given
      const repository = makeRepository();
      const expected = [] as TestItem[];

      // When
      const actual = [...repository.list()];

      // Then
      expect(actual).toEqual(expected);
    });

    test("should return items", () => {
      // Given
      const repository = makeRepository();
      const expected = [
        { id: 0, value: "foo" },
        { id: 1, value: "bar" },
      ] as TestItem[];
      expected.forEach((item) => repository.add(item));

      // When
      const actual = [...repository.list()];

      // Then
      expect(actual).toEqual(expected);
    });
  });

  describe("remove", () => {
    test("should remove known", () => {
      // Given
      const repository = makeRepository();
      const item = { id: 0, value: "foo" } as TestItem;
      repository.add(item);

      // When
      const didRemove = repository.remove(item.id);

      // Then
      expect(didRemove).toBeTrue();
      expect([...repository.list()].length).toBe(0);
    });

    test("should ignore unknown", () => {
      // Given
      const repository = makeRepository();
      const item = { id: 0, value: "foo" } as TestItem;

      // When
      const didRemove = repository.remove(item.id);

      // Then
      expect(!didRemove).toBeTrue();
    });
  });

  describe("hasItem", () => {
    test("should return true on known", () => {
      // Given
      const repository = makeRepository();
      const item = { id: 0, value: "foo" } as TestItem;
      repository.add(item);

      // When
      const result = repository.hasItem(item);

      // Then
      expect(result).toBeTrue();
    });

    test("should return false on unknown", () => {
      // Given
      const repository = makeRepository();
      const item = { id: 0, value: "foo" } as TestItem;

      // When
      const result = repository.hasItem(item);

      // Then
      expect(!result).toBeTrue();
    });
  });

  describe("removeItem", () => {
    test("should remove known", () => {
      // Given
      const repository = makeRepository();
      const item = { id: 0, value: "foo" } as TestItem;
      repository.add(item);

      // When
      const didRemove = repository.removeItem(item);

      // Then
      expect(didRemove).toBeTrue();
      expect([...repository.list()].length).toBe(0);
    });

    test("should ignore unknown", () => {
      // Given
      const repository = makeRepository();
      const item = { id: 0, value: "foo" } as TestItem;

      // When
      const didRemove = repository.removeItem(item);

      // Then
      expect(!didRemove).toBeTrue();
    });
  });
});
