import { describe, expect, test } from "bun:test";
import { Command } from "@lib/command.js";
import { TestingExchange } from "./testing.exchange.js";

describe("Exchange", () => {
  describe("ReadableExchange", () => {
    describe("onCommand()", () => {
      test("should return command", async () => {
        const exchange = new TestingExchange(
          "1",
          new Command({ name: "command", text: "" }),
        );
        exchange.push(new Command({ name: "else", text: "" }));

        expect(await exchange.onCommand()).toEqual({
          name: "else",
          text: "",
        });
      });
      test("should throw if closed", async () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "command",
            text: "",
            streamId: "1234",
            isStreamEnd: true,
          }),
        );

        expect(async () => await exchange.onCommand()).toThrow();
      });
    });
    describe("onReply()", () => {
      test("should return response", async () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "command",
            text: "",
            requestId: "1234",
            isRequest: true,
          }),
        );

        exchange.push(
          new Command({
            name: "",
            text: "foo",
            requestId: "1234",
            isSuccessResponse: true,
          }),
        );
        expect(await exchange.onReply()).toEqual({
          name: "",
          text: "foo",
          requestId: "1234",
          isSuccessResponse: true,
        });
      });
      test("should throw after fail", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "command",
            text: "",
            requestId: "1234",
            isRequest: true,
          }),
        );

        exchange.push(
          new Command({
            name: "",
            text: "error",
            requestId: "1234",
            isErrorResponse: true,
          }),
        );
        expect(async () => await exchange.onReply()).toThrowError();
      });
      test("should throw if already closed", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "command",
            text: "",
            requestId: "1234",
            isRequest: true,
          }),
        );
        exchange.reply({ text: "bye" });
        expect(async () => await exchange.onReply()).toThrow();
      });
    });

    describe("onStream()", () => {
      test("should return chunk", async () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "stream",
            text: "",
            streamId: "1234",
            isStreamChunk: true,
          }),
        );
        exchange.onStream(); // Discard initial message

        exchange.push(
          new Command({
            name: "stream",
            text: "foo",
            streamId: "1234",
            isStreamChunk: true,
          }),
        );
        expect(await exchange.onStream()).toEqual({
          name: "stream",
          text: "foo",
          streamId: "1234",
          isStreamChunk: true,
        });
      });
      test("should return end", async () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "stream",
            text: "",
            streamId: "1234",
            isStreamChunk: true,
          }),
        );
        exchange.onStream(); // Discard initial message

        exchange.push(
          new Command({
            name: "stream",
            text: "",
            streamId: "1234",
            isStreamEnd: true,
          }),
        );
        expect(await exchange.onStream()).toEqual({
          name: "stream",
          text: "",
          streamId: "1234",
          isStreamEnd: true,
        });
      });
      test("should return earlier chunk", async () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "stream",
            text: "",
            streamId: "1234",
            isStreamChunk: true,
          }),
        );
        exchange.push(
          new Command({
            name: "stream",
            text: "foo",
            streamId: "1234",
            isStreamChunk: true,
          }),
        );

        expect(await exchange.onStream()).toEqual({
          name: "stream",
          text: "",
          streamId: "1234",
          isStreamChunk: true,
        });
        expect(await exchange.onStream()).toEqual({
          name: "stream",
          text: "foo",
          streamId: "1234",
          isStreamChunk: true,
        });
      });
      test("should throw on fail", async () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "stream",
            text: "",
            streamId: "1234",
            isStreamChunk: true,
          }),
        );
        exchange.onStream(); // Discard initial message

        exchange
          .onStream()
          .then(() => expect().fail("Promise should not resolve!"))
          .catch(() => expect().pass("Error was thrown"));

        exchange.push(
          new Command({
            name: "stream",
            text: "error",
            requestId: "1234",
            isErrorResponse: true,
          }),
        );
      });
      test("should throw if already closed", async () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "stream",
            text: "",
            streamId: "1234",
            isStreamEnd: true,
          }),
        );

        exchange
          .onStream()
          .then(() => expect().fail("Promise shouldn't resolve!"))
          .catch(() => expect().pass("Error was thrown"));
      });
    });

    describe("chunks()", () => {
      test("should return chunks", async () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "stream",
            text: "foo",
            streamId: "1234",
            isStreamChunk: true,
          }),
        );

        exchange.push(
          new Command({
            name: "",
            text: "bar",
            isStreamChunk: true,
            streamId: "1234",
          }),
        );
        exchange.push(
          new Command({
            name: "",
            text: "",
            isStreamEnd: true,
            streamId: "1234",
          }),
        );

        expect(await Array.fromAsync(exchange.chunks())).toEqual([
          {
            name: "stream",
            text: "foo",
            streamId: "1234",
            isStreamChunk: true,
          },
          {
            name: "",
            text: "bar",
            streamId: "1234",
            isStreamChunk: true,
          },
        ]);
      });

      test("should return remaining chunks", async () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "stream",
            text: "foo",
            streamId: "1234",
            isStreamChunk: true,
          }),
        );

        exchange.push(
          new Command({
            name: "",
            text: "bar",
            isStreamChunk: true,
            streamId: "1234",
          }),
        );
        exchange.push(
          new Command({
            name: "",
            text: "",
            isStreamEnd: true,
            streamId: "1234",
          }),
        );

        exchange.onStream();
        expect(await Array.fromAsync(exchange.chunks())).toEqual([
          {
            name: "",
            text: "bar",
            streamId: "1234",
            isStreamChunk: true,
          },
        ]);
      });
      test("should throw on fail", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "stream",
            text: "foo",
            streamId: "1234",
            isStreamChunk: true,
          }),
        );

        exchange.push(
          new Command({
            name: "",
            requestId: "1234",
            text: "",
            isErrorResponse: true,
          }),
        );

        Array.fromAsync(exchange.chunks())
          .then(() => expect().fail("Promise shouldn't resolve!"))
          .catch(() => expect().pass("Error was thrown"));
      });
      test("should throw if already closed", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "stream",
            text: "foo",
            streamId: "1234",
            isStreamChunk: true,
          }),
        );

        exchange.push(
          new Command({
            name: "",
            streamId: "1234",
            text: "",
            isStreamEnd: true,
          }),
        );

        Array.fromAsync(exchange.chunks())
          .then(() => expect().fail("Promise shouldn't resolve!"))
          .catch(() => expect().pass("Error was thrown"));
      });
    });
  });

  describe("WritableExchange", () => {
    describe("send()", () => {
      test("should send data", () => {
        const exchange = new TestingExchange();
        exchange.send({ name: "command", text: "data" });
        expect(exchange.outbox).toEqual([
          ["", { name: "command", text: "data" }],
        ]);
      });
    });

    describe("request()", () => {
      test("should send request with generated id", () => {
        const exchange = new TestingExchange();
        exchange.request({
          name: "command",
          text: "data",
        });

        const sent = exchange.outbox[0][1];
        expect(sent.name).toEqual("command");
        expect(sent.text).toEqual("data");
        expect(sent.isRequest).toBeTrue();
        expect(sent.requestId).not.toBeNull();
      });

      test("should reset command flags", () => {
        const exchange = new TestingExchange();
        exchange.request({
          name: "command",
          text: "data",
          isSuccessResponse: true,
          isErrorResponse: true,
          isStreamChunk: true,
          isStreamEnd: true,
        });

        const sent = exchange.outbox[0][1];
        expect(sent.name).toEqual("command");
        expect(sent.text).toEqual("data");
        expect(sent.isRequest).toBeTrue();
        expect(sent.isSuccessResponse).toBeFalsy();
        expect(sent.isErrorResponse).toBeFalsy();
        expect(sent.isStreamChunk).toBeFalsy();
        expect(sent.isStreamEnd).toBeFalsy();
        expect(sent.requestId).not.toBeNull();
      });
    });

    describe("reply()", () => {
      test("should reply to request", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "request",
            text: "",
            requestId: "1234",
            isRequest: true,
          }),
        );
        exchange.reply({ text: "foo" });

        expect(exchange.outbox).toEqual([
          [
            "1",
            {
              name: "",
              requestId: "1234",
              text: "foo",
              isSuccessResponse: true,
            },
          ],
        ]);
      });

      test("should reset flags", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "request",
            text: "",
            requestId: "1234",
            isRequest: true,
          }),
        );
        exchange.reply({
          text: "foo",
          isErrorResponse: true,
          isStreamChunk: true,
          isStreamEnd: true,
        });

        const sent = exchange.outbox[0][1];
        expect(sent.name).toEqual("");
        expect(sent.text).toEqual("foo");
        expect(sent.isRequest).toBeFalsy();
        expect(sent.isSuccessResponse).toBeTrue();
        expect(sent.isErrorResponse).toBeFalsy();
        expect(sent.isStreamChunk).toBeFalsy();
        expect(sent.isStreamEnd).toBeFalsy();
        expect(sent.requestId).toBe("1234");
      });

      test("should reply to stream", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "stream",
            text: "",
            streamId: "1234",
            isStreamChunk: true,
          }),
        );
        exchange.reply({ text: "foo" });

        expect(exchange.outbox).toEqual([
          [
            "1",
            {
              name: "",
              requestId: "1234",
              text: "foo",
              isSuccessResponse: true,
            },
          ],
        ]);
      });
      test("should throw without id", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({ name: "command", text: "" }),
        );

        expect(() => exchange.reply({ text: "foo" })).toThrow();
      });
      test("should throw if closed", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "stream",
            text: "",
            streamId: "1234",
            isStreamChunk: true,
          }),
        );
        exchange.reply({ text: "foo" });

        expect(() => exchange.reply({ text: "bar" })).toThrow();
      });
    });

    describe("fail()", () => {
      test("should reply failure to request", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "request",
            text: "",
            requestId: "1234",
            isRequest: true,
          }),
        );
        exchange.fail({ text: "error" });

        expect(exchange.outbox).toEqual([
          [
            "1",
            {
              name: "",
              requestId: "1234",
              text: "error",
              isErrorResponse: true,
            },
          ],
        ]);
      });

      test("should reset flags", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "request",
            text: "",
            requestId: "1234",
            isRequest: true,
          }),
        );
        exchange.fail({
          text: "error",
          isRequest: true,
          isSuccessResponse: true,
          isStreamChunk: true,
          isStreamEnd: true,
        });

        const sent = exchange.outbox[0][1];
        expect(sent.name).toEqual("");
        expect(sent.text).toEqual("error");
        expect(sent.isRequest).toBeFalsy();
        expect(sent.isSuccessResponse).toBeFalsy();
        expect(sent.isErrorResponse).toBeTrue();
        expect(sent.isStreamChunk).toBeFalsy();
        expect(sent.isStreamEnd).toBeFalsy();
        expect(sent.requestId).toBe("1234");
      });

      test("should reply failure to stream", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "request",
            text: "",
            streamId: "1234",
            isStreamChunk: true,
          }),
        );
        exchange.fail({ text: "error" });

        expect(exchange.outbox).toEqual([
          [
            "1",
            {
              name: "",
              requestId: "1234",
              text: "error",
              isErrorResponse: true,
            },
          ],
        ]);
      });
      test("should throw without id", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({ name: "command", text: "" }),
        );

        expect(() => exchange.fail({ text: "error" })).toThrow();
      });
      test("should throw if closed", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "stream",
            text: "",
            streamId: "1234",
            isStreamChunk: true,
          }),
        );
        exchange.reply({ text: "foo" });

        expect(() => exchange.fail({ text: "bar" })).toThrow();
      });
    });

    describe("stream()", () => {
      test("should stream with stream id", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "stream",
            text: "",
            streamId: "1234",
            isStreamChunk: true,
          }),
        );
        exchange.stream({ text: "foo" });
        expect(exchange.outbox).toEqual([
          [
            "1",
            {
              name: "",
              isStreamChunk: true,
              text: "foo",
              streamId: "1234",
            },
          ],
        ]);
      });

      test("should reset flags", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "stream",
            text: "",
            streamId: "1234",
            isStreamChunk: true,
          }),
        );
        exchange.stream({
          text: "foo",
          isRequest: true,
          isSuccessResponse: true,
          isErrorResponse: true,
          isStreamEnd: true,
        });

        const sent = exchange.outbox[0][1];
        expect(sent.name).toEqual("");
        expect(sent.text).toEqual("foo");
        expect(sent.isRequest).toBeFalsy();
        expect(sent.isSuccessResponse).toBeFalsy();
        expect(sent.isErrorResponse).toBeFalsy();
        expect(sent.isStreamChunk).toBeTrue();
        expect(sent.isStreamEnd).toBeFalsy();
        expect(sent.streamId).toBe("1234");
      });

      test("should stream to request", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "stream-req",
            text: "",
            requestId: "1234",
            isRequest: true,
          }),
        );
        exchange.stream({ text: "foo" });
        expect(exchange.outbox).toEqual([
          [
            "1",
            {
              name: "",
              isStreamChunk: true,
              text: "foo",
              streamId: "1234",
            },
          ],
        ]);
      });
      test("should throw without id", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({ name: "stream", text: "" }),
        );
        expect(() => exchange.stream({ text: "foo" })).toThrow();
      });
      test("should throw if closed", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "stream",
            text: "",
            streamId: "1234",
            isStreamChunk: true,
          }),
        );
        exchange.finishStream();

        expect(() => exchange.stream({ text: "foo" })).toThrow();
      });
    });

    describe("finishStream()", () => {
      test("should finish stream", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "stream",
            text: "foo",
            streamId: "1234",
            isStreamChunk: true,
          }),
        );
        exchange.finishStream();

        expect(exchange.outbox).toEqual([
          [
            "1",
            {
              name: "",
              streamId: "1234",
              isStreamEnd: true,
            },
          ],
        ]);
      });

      test("should finish to request", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({
            name: "stream-req",
            text: "",
            requestId: "1234",
            isRequest: true,
          }),
        );
        exchange.finishStream();

        expect(exchange.outbox).toEqual([
          [
            "1",
            {
              name: "",
              streamId: "1234",
              isStreamEnd: true,
            },
          ],
        ]);
      });

      test("should throw without id", () => {
        const exchange = new TestingExchange(
          "1",
          new Command({ name: "stream", text: "foo" }),
        );
        expect(() => exchange.finishStream()).toThrow();
      });
    });
  });
});
