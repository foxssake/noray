import { beforeEach, describe, expect, mock, test } from "bun:test";
import { TestingReactor } from "./testing.reactor.js";

let reactor: TestingReactor<string>;

describe("Reactor", () => {
  beforeEach(() => {
    reactor = new TestingReactor();
  });

  describe("ingest()", () => {
    test("should parse separately per connection", () => {
      reactor.on("echo", (cmd, xchg) => {
        xchg.replyOrSend(cmd);
      });

      // Send the command in two parts, from different sources
      // The reactor should parse them separately, instead of parsing all of
      // them in one stream
      reactor.ingest("echo ", "0");
      reactor.ingest(" foo\n", "1");

      // Outbox should be empty
      expect(reactor.outbox).toBeEmpty();
    });

    test("should not throw on unknown exchange", async () => {
      expect(
        async () => await reactor.ingest(".1234 foo\n", "0"),
      ).not.toThrow();
    });

    test("should never throw", async () => {
      // Throw random strings at the reactor and see if it fails
      const count = 1024;
      const length = 32;
      const charset =
        "abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=,./<>?";

      const inputs = [...new Array(count)].map(
        () =>
          `${[...new Array(length)]
            .map(() => ~~(Math.random() * charset.length))
            .map((idx) => charset.charAt(idx))
            .join("")}\n`,
      );

      const promise = Promise.all(inputs.map((it) => reactor.ingest(it, "0")));

      console.log("Randomized inputs: ", inputs);
      expect(async () => await promise).not.toThrow();
    });
  });

  describe("knownCommands", () => {
    test("should return list", () => {
      reactor.on("foo", () => {});
      reactor.on("bar", () => {});

      expect(reactor.knownCommands).toEqual(["foo", "bar"]);
    });

    test("should return empty", () => {
      expect(reactor.knownCommands).toBeEmpty();
    });
  });

  describe("use()", () => {
    test("should call filters", () => {
      const firstFilter = mock((next) => {
        next();
      });
      const secondFilter = mock((next) => {
        next();
      });
      const handler = mock();

      reactor.use(firstFilter).use(secondFilter).on("command", handler);

      reactor.ingest("command test\n", "session");

      // Assert everything was called
      expect(firstFilter.mock.calls).not.toBeEmpty();
      expect(secondFilter.mock.calls).not.toBeEmpty();
      expect(handler.mock.calls).not.toBeEmpty();

      // Assert call order
      expect(firstFilter.mock.invocationCallOrder[0]).toBeLessThan(
        secondFilter.mock.invocationCallOrder[0],
      );
      expect(secondFilter.mock.invocationCallOrder[0]).toBeLessThan(
        handler.mock.invocationCallOrder[0],
      );
    });

    test("should call filters on unknown", () => {
      const firstFilter = mock((next) => {
        next();
      });
      const secondFilter = mock((next) => {
        next();
      });

      reactor.use(firstFilter).use(secondFilter);

      reactor.ingest("command test\n", "session");

      // Assert everything was called
      expect(firstFilter.mock.calls).not.toBeEmpty();
      expect(secondFilter.mock.calls).not.toBeEmpty();

      // Assert call order
      expect(firstFilter.mock.invocationCallOrder[0]).toBeLessThan(
        secondFilter.mock.invocationCallOrder[0],
      );
    });

    test("should break filter chain", () => {
      const firstFilter = mock((next) => {
        next();
      });
      const secondFilter = mock();
      const handler = mock();

      reactor.use(firstFilter).use(secondFilter).on("command", handler);

      reactor.ingest("command test\n", "session");

      // Assert everything was called
      expect(firstFilter.mock.calls).not.toBeEmpty();
      expect(secondFilter.mock.calls).not.toBeEmpty();
      expect(handler.mock.calls).toBeEmpty();

      // Assert call order
      expect(firstFilter.mock.invocationCallOrder[0]).toBeLessThan(
        secondFilter.mock.invocationCallOrder[0],
      );
    });

    test("should handle async", async () => {
      const firstFilter = mock(async (next) => {
        await Bun.sleep(0);
        next();
      });
      const secondFilter = mock(async (next) => {
        next();
      });
      const handler = mock(async () => await Bun.sleep(0));

      reactor.use(firstFilter).use(secondFilter).on("command", handler);

      reactor.ingest("command test\n", "session");
      await Bun.sleep(0);

      // Assert everything was called
      expect(firstFilter.mock.calls).not.toBeEmpty();
      expect(secondFilter.mock.calls).not.toBeEmpty();
      expect(handler.mock.calls).not.toBeEmpty();

      // Assert call order
      expect(firstFilter.mock.invocationCallOrder[0]).toBeLessThan(
        secondFilter.mock.invocationCallOrder[0],
      );
      expect(secondFilter.mock.invocationCallOrder[0]).toBeLessThan(
        handler.mock.invocationCallOrder[0],
      );
    });

    test("should catch errors", async () => {
      const filter = () => {
        throw new Error("oh no!");
      };
      const errorHandler = mock();

      reactor.use(filter).onError(errorHandler);
      reactor.ingest("command test\n", "session");
      await Bun.sleep(0);

      expect(errorHandler.mock.calls).not.toBeEmpty();
    });
  });
});
