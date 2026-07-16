import { describe, expect, test } from "bun:test";
import { Command } from "@lib/command.js";
import { type Exchange, ExchangeMap } from "@lib/reactor.js";
import { TestingExchange } from "./testing.exchange.js";

describe("ExchangeMap", () => {
  test("should store exchange", () => {
    const map = new ExchangeMap<string, TestingExchange>();
    const exchange = new TestingExchange("1", new Command({ name: "foo" }));

    map.set("a", exchange);

    expect(map.has("a", "1")).toBeTrue();
    expect(map.get("a", "1")).toBe(exchange);
  });

  test("should delete exchange", () => {
    const map = new ExchangeMap<string, TestingExchange>();

    map.set("a", new TestingExchange("1", new Command({ name: "foo" })));
    map.set("b", new TestingExchange("1", new Command({ name: "bar" })));
    map.delete("a", "1");

    expect(map.has("a", "1")).toBeFalse();
    expect(map.get("a", "1")).toBeUndefined();
  });

  test("should bind same id to source", () => {
    // Have two exchanges with the same ID, but from different sources
    // The map should correctly return the exchange bound to the queried source
    const map = new ExchangeMap<string, TestingExchange>();
    const exchanges = [
      new TestingExchange("1", new Command({ name: "foo" })),
      new TestingExchange("1", new Command({ name: "bar" })),
    ];

    map.set("a", exchanges[0]);
    map.set("b", exchanges[1]);

    expect(map.has("a", "1")).toBeTrue();
    expect(map.has("b", "1")).toBeTrue();

    expect(map.get("a", "1")).toBe(exchanges[0]);
    expect(map.get("b", "1")).toBe(exchanges[1]);
  });
});
