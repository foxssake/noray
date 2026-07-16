import { describe, expect, test } from "bun:test";
import { Command, type CommandSpec } from "@lib/command.js";

type Kase = [string, CommandSpec, string];

describe("Commands", () => {
  describe("serialize()", () => {
    describe("simple commands", () =>
      tests([
        [
          "should stringify",
          { name: "command", chunks: [{ text: "data", isQuoted: false }] },
          "command data\n",
        ],
        [
          "should serialize raw",
          { name: "command", raw: Buffer.from([102, 0, 111]) },
          "\rcommand 3\nf\x00o\n",
        ],
      ]));

    describe("escaping", () =>
      tests([
        [
          "should escape newline in data",
          { name: "command", chunks: [{ text: "da\nta", isQuoted: false }] },
          "command da\\nta\n",
        ],
        [
          "should quote space in data",
          { name: "command", text: "foo bar" },
          'command "foo bar"\n',
        ],
        [
          "should escape newline in name",
          { name: "com\nmand", text: "data" },
          "com\\nmand data\n",
        ],
        [
          "should quote space in name",
          { name: "comm and", text: "data" },
          '"comm and" data\n',
        ],
        [
          "should escape \\r in name",
          { name: "\rcommand", text: "data" },
          "\\rcommand data\n",
        ],
        [
          "should retain quoted chunks",
          { name: "command", chunks: [{ text: "foo", isQuoted: true }] },
          'command "foo"\n',
        ],
      ]));

    describe("optimize", () =>
      tests([
        ["should optimize without data", { name: "command" }, "command\n"],
        ["should serialize empty", { name: "" }, "\n"],
      ]));

    describe("multiparam", () =>
      tests([
        [
          "should keep spaces between params",
          { name: "command", text: "", params: ["foo", "ba ar"] },
          'command foo "ba ar"\n',
        ],
        [
          "should fall back to chunks",
          {
            name: "command",
            params: ["foo", "bar"],
            chunks: [{ text: "bar foo", isQuoted: false }],
          },
          "command bar foo\n",
        ],
      ]));

    describe("key-value params", () =>
      tests([
        [
          "should serialize kvParams",
          {
            name: "command",
            kvParams: [
              ["foo", "bar"],
              ["quix", "baz"],
              ["foo", "baz"],
            ],
          },
          "command foo=bar quix=baz foo=baz\n",
        ],
        [
          "should quote kvParams",
          { name: "command", kvParams: [["foo", "bar baz"]] },
          'command foo="bar baz"\n',
        ],
        [
          "should prefer kvParams over kvMap",
          {
            name: "command",
            kvParams: [["foo", "bar"]],
            kvMap: new Map([["foo", "baz"]]),
          },
          "command foo=bar\n",
        ],
        [
          "should fall back to kvMap",
          {
            name: "command",
            kvMap: new Map([
              ["foo", "bar"],
              ["quix", "baz"],
            ]),
          },
          "command foo=bar quix=baz\n",
        ],
        [
          "should retain params",
          {
            name: "command",
            kvParams: [["foo", "bar"]],
            params: ["foo", "bar"],
          },
          "command foo bar foo=bar\n",
        ],
      ]));

    describe("request-response", () =>
      tests([
        [
          "should serialize request",
          {
            name: "command",
            requestId: "0123",
            isRequest: true,
            text: "foo",
          },
          "command?0123 foo\n",
        ],
        [
          "should serialize response",
          {
            name: "",
            requestId: "0123",
            isSuccessResponse: true,
            text: "bar",
          },
          ".0123 bar\n",
        ],
        [
          "should serialize error response",
          {
            name: "",
            requestId: "0123",
            isErrorResponse: true,
            text: "unknown command!",
          },
          '!0123 "unknown command!"\n',
        ],
      ]));

    describe("streams", () =>
      tests([
        [
          "should serialize stream chunk",
          {
            name: "command",
            streamId: "0123",
            isStreamChunk: true,
            text: "foo",
          },
          "command|0123 foo\n",
        ],
        [
          "should serialize stream chunk with empty id",
          {
            name: "command",
            streamId: "",
            isStreamChunk: true,
            text: "foo",
          },
          "command| foo\n",
        ],
        [
          "should serialize stream end",
          {
            name: "command",
            streamId: "0123",
            isStreamEnd: true,
            text: "",
          },
          "command|0123\n",
        ],
      ]));
  });
});

function tests(kases: Kase[]) {
  for (const kase of kases) {
    const [name, spec, expected] = kase;
    test(name, () => {
      expect(Command.serialize(spec)).toBe(expected);
    });
  }
}
