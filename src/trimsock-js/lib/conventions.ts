import type { CommandSpec } from "./command.ts";

export interface Convention {
  process(command: CommandSpec): CommandSpec;
}

export class ParamsConvention implements Convention {
  public process(command: CommandSpec): CommandSpec {
    // No text
    if (command.text === undefined || command.chunks === undefined)
      return command;

    const result = { ...command };

    const kvParams: [string, string][] = [];
    const params: string[] = [];

    const chunks = command.chunks.flatMap((it) =>
      it.isQuoted
        ? [it.text]
        : it.text
          .split(" ")
          .flatMap((it) => {
            const splitAt = it.indexOf("=");
            return splitAt >= 0
              ? [it.substring(0, splitAt), "=", it.substring(splitAt + 1)]
              : [it];
          })
          .filter((it) => it !== ""),
    );

    for (let i = 0; i < chunks.length; ++i) {
      const chunk = chunks[i];
      const prev = chunks[i - 1];
      const next = chunks[i + 1];

      if (next === "=" || prev === "=") continue;
      if (chunk === "=" && prev && next) kvParams.push([prev, next]);
      else params.push(chunk);
    }

    if (kvParams.length) {
      result.kvParams = kvParams;
      result.kvMap = new Map();

      for (const [key, value] of kvParams) result.kvMap.set(key, value);
    }

    // Retain params if there's at least one
    if (params.length > 0) result.params = params;
    else result.params = undefined;

    return result;
  }
}

export class RequestResponseConvention implements Convention {
  public process(command: CommandSpec): CommandSpec {
    const name = command.name;
    if (!/[?\.!]/.test(name)) return command; // not a request / response

    if (name.includes("?"))
      return { ...command, ...parseName(name, "?"), isRequest: true };
    if (name.includes("."))
      return {
        ...command,
        ...parseName(name, "."),
        isSuccessResponse: true,
      };
    if (name.includes("!"))
      return {
        ...command,
        ...parseName(name, "!"),
        isErrorResponse: true,
      };

    return command;
  }
}

export class StreamConvention implements Convention {
  public process(command: CommandSpec): CommandSpec {
    const name = command.name;
    if (!name.includes("|")) return command; // not a stream command

    const parts = parseName(name, "|");
    // NOTE: Last `?? 0` should never run, command has either `data` or `raw`
    const dataSize = command.text?.length ?? command.raw?.byteLength ?? 0;

    return {
      ...command,
      name: parts.name,
      streamId: parts.requestId,
      isStreamChunk: dataSize > 0 ? true : undefined,
      isStreamEnd: dataSize <= 0 ? true : undefined,
    };
  }
}

function parseName(
  name: string,
  separator: string,
): { name: string; requestId: string } {
  const idx = name.indexOf(separator);
  const subname = name.substring(0, idx);
  const requestId = name.substring(idx + 1);

  return { name: subname, requestId };
}
