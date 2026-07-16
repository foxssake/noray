import { describe, expect, test } from "bun:test";
import type { CommandSpec } from "@lib/command.js";
import { TrimsockReader } from "@lib/reader.js";

type Kase = [string, string, CommandSpec];

describe("RequestResponseConvention", () =>
  tests([
    [
      "should parse request",
      "get-logo?0123 \n",
      {
        name: "get-logo",
        text: "",
        chunks: [],
        isRequest: true,
        requestId: "0123",
      },
    ],
    [
      "should parse response",
      ".0123 0xFD\n",
      {
        name: "",
        text: "0xFD",
        chunks: [{ text: "0xFD", isQuoted: false }],
        params: ["0xFD"],
        isSuccessResponse: true,
        requestId: "0123",
      },
    ],
    [
      "should parse error",
      '!0123 "not found"\n',
      {
        name: "",
        text: "not found",
        chunks: [{ text: "not found", isQuoted: true }],
        params: ["not found"],
        isErrorResponse: true,
        requestId: "0123",
      },
    ],
    [
      "should passthrough params",
      ".0123 foo bar\n",
      {
        name: "",
        text: "foo bar",
        chunks: [{ text: "foo bar", isQuoted: false }],
        isSuccessResponse: true,
        requestId: "0123",
        params: ["foo", "bar"],
      },
    ],
    [
      "should parse raw",
      "\r.0123 4\n0xFD\n",
      {
        name: "",
        raw: Buffer.from("0xFD"),
        isSuccessResponse: true,
        requestId: "0123",
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
