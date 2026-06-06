import assert from "node:assert";

export type IdMapper<T, K> = (item: Partial<T>) => K | undefined;
export type ItemMerger<T> = (a: T, b: Partial<T>) => T;

export class IdInUseError extends Error { }
export class UnknownItemError extends Error { }

/**
 * Base class for repositories.
 */
export class Repository<T, K> {
  protected items = new Map<K, T>();

  constructor(
    private getId: IdMapper<T, K>,
    private merge: ItemMerger<T> = (a, b) => ({ ...a, ...b }),
  ) { }

  /**
   * Add item to repository.
   * @throws if item id is already in use
   */
  add(item: T): T {
    const id = this.requireId(item);

    if (this.has(id)) throw this.idInUseError(id);

    this.items.set(id, item);
    return item;
  }

  /**
   * Update an existing item.
   * @throws if item id not known
   */
  update(item: Partial<T>) {
    const id = this.requireId(item);
    const base = this.require(id);
    this.items.set(id, this.merge(base, item));
  }

  /**
   * Find item based on id.
   */
  find(id: K): T | undefined {
    return this.items.get(id);
  }

  /**
   * Return item with id or throw
   */
  require(id: K): T {
    const item = this.find(id);
    if (item === undefined) throw this.notFoundError(id);

    return item;
  }

  /**
   * Check if item with id exists.
   */
  has(id: K): boolean {
    return this.items.has(id);
  }

  /**
   * List all items in repository.
   */
  list(): IterableIterator<T> {
    return this.items.values();
  }

  /**
   * Count all items in repository
   */
  count(): number {
    return this.items.size;
  }

  /**
   * Remove item by id.
   */
  remove(id: K): boolean {
    return this.items.delete(id);
  }

  /**
   * Check if item exists.
   */
  hasItem(item: T): boolean {
    return this.items.has(this.requireId(item));
  }

  /**
   * Remove item.
   */
  removeItem(item: T): boolean {
    return this.items.delete(this.requireId(item));
  }

  /**
   * Remove all items from the repository
   */
  clear() {
    this.items.clear();
  }

  protected notFoundError(id: K): Error {
    return new UnknownItemError(`No item with ID: ${id}`);
  }

  protected idInUseError(id: K): Error {
    return new IdInUseError(`ID already in use: ${id}`);
  }

  private requireId(item: Partial<T>): K {
    const id = this.getId(item);
    assert(id !== undefined, "Item has no ID set!");
    return id;
  }
}

/**
 * Create an id mapper that grabs the given field of the object.
 */
export function fieldIdMapper<T extends Record<string, K>, K>(
  field: string,
): IdMapper<T, K> {
  return (v) => v[field];
}

/**
 * Create an id mapper that grabs the `id` field of the object.
 */
export function idFieldMapper<T extends { id: string }>(): IdMapper<T, string> {
  return (v) => v.id;
}

/**
 * Create an item merger that uses assignment update the object without changing
 * the reference.
 */
export function assignMerger<T>(): ItemMerger<T> {
  return (current, update) => {
    return { current, ...update } as T;
  };
}
