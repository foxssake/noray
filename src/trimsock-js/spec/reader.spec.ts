import { describe, expect, test } from "bun:test";
import type { CommandSpec } from "@lib/command.js";
import { BufferOverflowError } from "@lib/errors.js";
import { TrimsockReader } from "@lib/reader.js";

type Kase = [string, string[] | string, CommandSpec[]];

describe("TrimsockReader", () => {
  describe("name parsing", () =>
    tests([
      [
        "should parse simple name",
        "command \n",
        [{ name: "command", text: "", chunks: [] }],
      ],
      [
        "should parse quoted name",
        '"command name" \n',
        [{ name: "command name", text: "", chunks: [] }],
      ],
      [
        "should unescape simple name",
        'co\\n\\" \n',
        [{ name: 'co\n"', text: "", chunks: [] }],
      ],
      [
        "should unescape quoted name",
        '"\\"command\\"" \n',
        [{ name: '"command"', text: "", chunks: [] }],
      ],
    ]));

  describe("data chunks", () =>
    tests([
      [
        "should parse simple chunk",
        "command foo bar\n",
        [
          {
            name: "command",
            text: "foo bar",
            chunks: [{ text: "foo bar", isQuoted: false }],
          },
        ],
      ],
      [
        "should parse quoted chunk",
        'command "foo bar"\n',
        [
          {
            name: "command",
            text: "foo bar",
            chunks: [{ text: "foo bar", isQuoted: true }],
          },
        ],
      ],
      [
        "should parse mixed chunks",
        'command foo "bar quix" baz\n',
        [
          {
            name: "command",
            text: "foo bar quix baz",
            chunks: [
              { text: "foo ", isQuoted: false },
              { text: "bar quix", isQuoted: true },
              { text: " baz", isQuoted: false },
            ],
          },
        ],
      ],
      [
        "should unescape simple chunk",
        "command foo\\nbar\n",
        [
          {
            name: "command",
            text: "foo\nbar",
            chunks: [{ text: "foo\nbar", isQuoted: false }],
          },
        ],
      ],
      [
        "should unescape quoted chunk",
        'command "foo\\"bar"\n',
        [
          {
            name: "command",
            text: 'foo"bar',
            chunks: [{ text: 'foo"bar', isQuoted: true }],
          },
        ],
      ],
    ]));

  describe("technically well formed commands", () =>
    tests([
      [
        "should parse space command",
        " \n",
        [{ name: "", text: "", chunks: [] }],
      ],
      [
        "should parse empty command",
        "\n",
        [{ name: "", text: "", chunks: [] }],
      ],
      [
        "should parse name only command",
        "command\n",
        [{ name: "command", text: "", chunks: [] }],
      ],
    ]));

  describe("raw commands", () =>
    tests([
      [
        "should parse raw",
        "\rcommand 4\n1234\n",
        [{ name: "command", raw: Buffer.from("1234") }],
      ],
      [
        "should parse empty raw",
        "\rcommand 0\n\n",
        [{ name: "command", raw: Buffer.of() }],
      ],
    ]));

  describe("chunked commands", () =>
    tests([
      [
        "should parse command in chunks",
        ["comm", "and ", "data", "\n"],
        [
          {
            name: "command",
            text: "data",
            chunks: [{ text: "data", isQuoted: false }],
          },
        ],
      ],
      [
        "should parse quoted command name in chunks",
        ['"', "command", '" ', "data", "\n"],
        [
          {
            name: "command",
            text: "data",
            chunks: [{ text: "data", isQuoted: false }],
          },
        ],
      ],
      [
        "should parse quoted chunk in chunks",
        ["command ", '"', "foo bar", '"\n'],
        [
          {
            name: "command",
            text: "foo bar",
            chunks: [{ text: "foo bar", isQuoted: true }],
          },
        ],
      ],
      [
        "should parse raw command in chunks",
        ["\rcommand 1", "0\n", "0123", "456789\n"],
        [{ name: "command", raw: Buffer.from("0123456789") }],
      ],
      [
        "should parse regular and raw commands",
        ["command foo\n\rraw 4\n1234\ncommand bar\n"],
        [
          {
            name: "command",
            text: "foo",
            chunks: [{ text: "foo", isQuoted: false }],
          },
          { name: "raw", raw: Buffer.from("1234") },
          {
            name: "command",
            text: "bar",
            chunks: [{ text: "bar", isQuoted: false }],
          },
        ],
      ],
    ]));

  test("should throw on buffer overflow", () => {
    const reader = new TrimsockReader();
    reader.maxSize = 8;

    expect(() => reader.ingest("command foobar\n")).toThrow(
      BufferOverflowError,
    );
  });
});

function tests(kases: Kase[]) {
  for (const [name, input, expected] of kases) {
    const chunks = typeof input === "string" ? [input] : [...input];

    test(name, () => {
      const reader = new TrimsockReader();
      const results: CommandSpec[] = [];

      reader.disableConventions();
      for (const chunk of chunks) {
        reader.ingest(chunk);
        results.push(...reader.commands());
      }

      expect(results).toEqual(expected);
    });
  }
}
