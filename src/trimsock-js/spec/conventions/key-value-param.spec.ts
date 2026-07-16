import { describe, expect, test } from "bun:test";
import type { CommandSpec } from "@lib/command.js";
import { TrimsockReader } from "@lib/reader.js";

type Kase = [string, string, CommandSpec];

describe("KeyValueParamConvention", () =>
  tests([
    [
      "should parse unquoted pair",
      "cmd key=value\n",
      {
        name: "cmd",
        text: "key=value",
        chunks: [{ text: "key=value", isQuoted: false }],
        kvParams: [["key", "value"]],
        kvMap: mapOf("key", "value"),
      },
    ],
    [
      "should parse quoted pair",
      'cmd "foo bar"="quix baz"\n',
      {
        name: "cmd",
        text: "foo bar=quix baz",
        chunks: [
          { text: "foo bar", isQuoted: true },
          { text: "=", isQuoted: false },
          { text: "quix baz", isQuoted: true },
        ],
        kvParams: [["foo bar", "quix baz"]],
        kvMap: mapOf("foo bar", "quix baz"),
      },
    ],
    [
      "should parse unquoted-quoted pair",
      'cmd foo="bar quix"\n',
      {
        name: "cmd",
        text: "foo=bar quix",
        chunks: [
          { text: "foo=", isQuoted: false },
          { text: "bar quix", isQuoted: true },
        ],
        kvParams: [["foo", "bar quix"]],
        kvMap: mapOf("foo", "bar quix"),
      },
    ],
    [
      "should parse quoted-unquoted pair",
      'cmd "foo bar"=quix\n',
      {
        name: "cmd",
        text: "foo bar=quix",
        chunks: [
          { text: "foo bar", isQuoted: true },
          { text: "=quix", isQuoted: false },
        ],
        kvParams: [["foo bar", "quix"]],
        kvMap: mapOf("foo bar", "quix"),
      },
    ],
    [
      "should pass through params",
      "cmd foo bar quix=baz\n",
      {
        name: "cmd",
        text: "foo bar quix=baz",
        chunks: [{ text: "foo bar quix=baz", isQuoted: false }],
        params: ["foo", "bar"],
        kvParams: [["quix", "baz"]],
        kvMap: mapOf("quix", "baz"),
      },
    ],
    [
      "should retain param order",
      'cmd "foo bar" quix "foo bar"="bar quix"\n',
      {
        name: "cmd",
        text: "foo bar quix foo bar=bar quix",
        chunks: [
          { text: "foo bar", isQuoted: true },
          { text: " quix ", isQuoted: false },
          { text: "foo bar", isQuoted: true },
          { text: "=", isQuoted: false },
          { text: "bar quix", isQuoted: true },
        ],
        params: ["foo bar", "quix"],
        kvParams: [["foo bar", "bar quix"]],
        kvMap: mapOf("foo bar", "bar quix"),
      },
    ],
    [
      "should handle repeated keys",
      "cmd foo=bar foo=baz\n",
      {
        name: "cmd",
        text: "foo=bar foo=baz",
        chunks: [{ text: "foo=bar foo=baz", isQuoted: false }],
        kvParams: [
          ["foo", "bar"],
          ["foo", "baz"],
        ],
        kvMap: mapOf("foo", "baz"),
      },
    ],
    [
      "should parse params and key-value pairs",
      "cmd foo bar foo=bar\n",
      {
        name: "cmd",
        text: "foo bar foo=bar",
        chunks: [{ text: "foo bar foo=bar", isQuoted: false }],
        kvParams: [["foo", "bar"]],
        kvMap: new Map([["foo", "bar"]]),
        params: ["foo", "bar"],
      },
    ],
    [
      "should parse single param and key-value pairs",
      "cmd foo quix=baz bar=uhh\n",
      {
        name: "cmd",
        text: "foo quix=baz bar=uhh",
        chunks: [{ text: "foo quix=baz bar=uhh", isQuoted: false }],
        kvParams: [
          ["quix", "baz"],
          ["bar", "uhh"],
        ],
        kvMap: new Map([
          ["quix", "baz"],
          ["bar", "uhh"],
        ]),
        params: ["foo"],
      },
    ],
  ]));

function tests(cases: Kase[]) {
  for (const [name, input, expected] of cases) {
    test(name, () => {
      const reader = new TrimsockReader();
      reader.ingest(input);
      const actual = reader.read();
      expect(actual).toEqual(expected);
    });
  }
}

function mapOf(...values: string[]): Map<string, string> {
  const map = new Map<string, string>();

  for (let i = 0; i < values.length; ) map.set(values[i++], values[i++]);

  return map;
}
