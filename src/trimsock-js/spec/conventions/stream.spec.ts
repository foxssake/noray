import { describe, expect, test } from "bun:test";
import type { CommandSpec } from "@lib/command.js";
import { TrimsockReader } from "@lib/reader.js";

type Kase = [string, string, CommandSpec];

describe("StreamConvention", () =>
  tests([
    [
      "should parse stream chunk",
      "lobbies|0123 foo\n",
      {
        name: "lobbies",
        text: "foo",
        chunks: [{ text: "foo", isQuoted: false }],
        params: ["foo"],
        isStreamChunk: true,
        streamId: "0123",
      },
    ],
    [
      "should parse stream end",
      "lobbies|0123 \n",
      {
        name: "lobbies",
        text: "",
        chunks: [],
        isStreamEnd: true,
        streamId: "0123",
      },
    ],
    [
      "should passthrough params",
      "lobbies|0123 foo 5/7\n",
      {
        name: "lobbies",
        text: "foo 5/7",
        chunks: [{ text: "foo 5/7", isQuoted: false }],
        params: ["foo", "5/7"],
        isStreamChunk: true,
        streamId: "0123",
      },
    ],
    [
      "should passthrough raw",
      "\rlobbies|0123 4\n1234\n",
      {
        name: "lobbies",
        raw: Buffer.from("1234"),
        isStreamChunk: true,
        streamId: "0123",
      },
    ],
    [
      "should parse raw stream end",
      "\rlobbies|0123 0\n\n",
      {
        name: "lobbies",
        raw: Buffer.of(),
        isStreamEnd: true,
        streamId: "0123",
      },
    ],
  ]));

function tests(cases: Kase[]) {
  for (const [name, input, expected] of cases) {
    test(name, () => {
      const reader = new TrimsockReader();
      reader.ingest(input);
      expect(reader.read()).toEqual(expected);
    });
  }
}
