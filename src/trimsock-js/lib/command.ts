import assert from "./assert.ts";

/**
 * A single chunk of command data extracted from the command line
 */
export interface CommandDataChunk {
  /**
   * Chunk text
   */
  text: string;

  /**
   * True if the chunk was specified in quotes
   */
  isQuoted: boolean;
}

/**
 * Describes the core data fields of a command, without conventions
 * @category Parser
 */
export interface BaseCommandSpec {
  /**
   * The command name
   */
  name: string;

  /**
   * Raw command data
   *
   * For regular commands, `raw` is undefined, and {@link text} is used.
   */
  raw?: Buffer;

  /**
   * Command data in text
   *
   * For raw commands, `text` is undefined, and {@link raw} is used.
   */
  text?: string;

  /**
   * List of data chunks
   */
  chunks?: CommandDataChunk[];
}

interface MultiparamCommandSpec extends BaseCommandSpec {
  /**
   * Command parameters parsed from {@link chunks}
   *
   * Undefined if the data does not contain multiple parameters.
   */
  params?: Array<string>;
}

interface KeyValueParamCommandSpec extends BaseCommandSpec {
  /**
   * List of key-value parameters
   *
   * If a key appears multiple times in the command, it will appear multiple times
   * in this list.
   */
  kvParams?: Array<[string, string]>;

  /**
   * Key-value parameters as a map
   *
   * If a key appears multiple times in the command, only its last value will
   * appear here.
   */
  kvMap?: Map<string, string>;
}

interface RequestResponseCommandSpec extends BaseCommandSpec {
  /**
   * Request ID, used to associate responses with requests
   */
  requestId?: string;

  /**
   * Flag marking requests
   *
   * Exclusive with the other flags.
   */
  isRequest?: boolean;

  /**
   * Flag marking success responses
   *
   * If this flag is true, the other peer has succesfully processed the request,
   * and this command contains its response. Exclusive with the other flags.
   */
  isSuccessResponse?: boolean;

  /**
   * Flag marking error responses
   *
   * If this flag is true, the other peer has failed to process the request.
   * This command may carry information about the error. Exclusive with the
   * other flags.
   */
  isErrorResponse?: boolean;
}

interface StreamCommandSpec extends BaseCommandSpec {
  /**
   * Stream ID, used to associate data chunks with streams
   */
  streamId?: string;

  /**
   * Flag marking stream chunks
   *
   * If this flag is true, this command carries a chunk of data belonging to a
   * stream. Exclusive with the other flags.
   */
  isStreamChunk?: boolean;

  /**
   * Flag marking a stream's end
   *
   * If this flag is true, this command closes the stream, meaning no more data
   * should be expected. Exclusive with the other flags.
   */
  isStreamEnd?: boolean;
}

/**
 * Describes all the data in a command, including conventions
 * @category Parser
 */
export interface CommandSpec
  extends BaseCommandSpec,
  MultiparamCommandSpec,
  KeyValueParamCommandSpec,
  RequestResponseCommandSpec,
  StreamCommandSpec { }

/**
 * Specifies a {@link CommandSpec}, while implementing utility methods
 * @category Parser
 */
export class Command implements CommandSpec {
  name: string;
  text?: string;
  chunks?: CommandDataChunk[];
  raw?: Buffer;
  params?: string[];
  kvParams?: Array<[string, string]>;
  kvMap?: Map<string, string>;
  requestId?: string;
  isRequest?: boolean;
  isSuccessResponse?: boolean;
  isErrorResponse?: boolean;
  streamId?: string;
  isStreamChunk?: boolean;
  isStreamEnd?: boolean;

  constructor(spec: CommandSpec) {
    this.name = spec.name;
    Object.assign(this, spec);
  }

  /**
   * Exchange ID - this can be either the stream or the request ID, or undefined
   * if the command has no identifier
   */
  get id(): string | undefined {
    return this.streamId ?? this.requestId;
  }

  /**
   * Whether the command closes an exchange or not
   *
   * If this is true, no more commands should are expected with the same {@link
   * id}.
   */
  get isClosing(): boolean {
    return this.isResponse || this.isStreamEnd || false;
  }

  /**
   * Whether the command is a response or not
   *
   * If this is true, the command is either a success or an error response, sent
   * after the sender has processed a previous request.
   */
  get isResponse(): boolean {
    return this.isSuccessResponse || this.isErrorResponse || false;
  }

  /**
   * Whether the command belongs to a stream or not
   *
   * If this is true, the command is either a stream chunk or a stream end
   * marker.
   */
  get isStream(): boolean {
    return this.isStreamChunk || this.isStreamEnd || false;
  }

  /**
   * Whether this command uses conventions or not
   *
   * If this is true, it means that no conventions are used, the command is in
   * the form of `<command> <data>\n`. In other words, this command does not
   * belong to a request, a stream, or other convention.
   *
   * Note that multiparam commands can still be considered simple.
   */
  get isSimple(): boolean {
    return !this.isRequest && !this.isResponse && !this.isStream;
  }

  /**
   * Whether this command contains raw data or not
   */
  get isRaw(): boolean {
    return this.raw !== undefined;
  }

  /**
   * Return the command's {@link id}, or throw if there's no id to return
   */
  requireId(): string {
    assert(this.id !== undefined, "No request or stream ID is present!");
    return this.id;
  }

  /**
   * Return the command's {@link params}, or throw if they're not defined
   *
   * @param amount the number of required parameters; omit if no parameter count
   * validation is needed
   */
  requireParams(amount?: number): Array<string> {
    if (amount === undefined)
      assert(this.params !== undefined, "This command requires params!");
    else
      assert(
        this.params !== undefined && this.params.length === amount,
        `This command requires ${amount} params!`,
      );

    return this.params;
  }

  /**
   * Return a parameter by index, or throw if it's not defined
   *
   * @param index parameter index
   */
  requireParam(index: number): string {
    return this.requireParams()[index];
  }

  /**
   * Return the command's {@link raw} data, or throw if it's not present
   */
  requireRaw(): Buffer {
    assert(this.raw !== undefined, "Command has no raw data!");
    return this.raw;
  }

  /**
   * Return the command's text {@link text}, or throw if it's not present
   */
  requireText(): string {
    assert(this.text !== undefined, "Command has no text data!");
    return this.text;
  }

  /**
   * Serialize the command into a string, that can be transmitted over trimsock
   *
   * @returns serialized command string
   */
  serialize(): string {
    return Command.serialize(this);
  }

  /**
   * Serialize the command into a string, that can be transmitted over trimsock
   *
   * @returns serialized command string
   */
  static serialize(spec: CommandSpec): string {
    let name = "";

    // Figure out final spec.name
    if (spec.isStreamChunk || spec.isStreamEnd)
      name = `${spec.name}|${spec.streamId}`;
    else if (spec.isRequest) name = `${spec.name}?${spec.requestId}`;
    else if (spec.isSuccessResponse) name = `${spec.name}.${spec.requestId}`;
    else if (spec.isErrorResponse) name = `${spec.name}!${spec.requestId}`;
    else name = spec.name;

    name = Command.toChunk(name);

    // Early return for raw spec.
    if (spec.raw)
      return spec.raw.byteLength !== 0
        ? `\r${name} ${spec.raw.byteLength}\n${spec.raw.toString("ascii")}\n`
        : `${name} \n`;

    // Figure out data
    let data = "";

    // Prefer chunks
    if (spec.chunks)
      data = spec.chunks.map((it) => Command.toChunk(it)).join("") ?? "";
    // If no chunks, serialize structural conventions
    else if (spec.params || spec.kvParams || spec.kvMap) {
      for (const it of spec.params ?? []) data += `${Command.toChunk(it)} `;

      for (const [key, value] of spec.kvParams ?? spec.kvMap?.entries() ?? [])
        data += `${Command.toChunk(key)}=${Command.toChunk(value)} `;

      data = data.trimEnd();
    }
    // If no conventions, take text
    else if (spec.text) data = Command.toChunk(spec.text);
    // No data
    else data = "";

    return data ? `${name} ${data}\n` : `${name}\n`;
  }

  /**
   * Serialize a piece of text as a command data chunk, quoting and escaping it
   * as necessary
   */
  static toChunk(what: string | CommandDataChunk): string {
    if (typeof what === "string")
      return what.includes(" ")
        ? `"${Command.escapeQuoted(what)}"`
        : Command.escape(what);

    return what.isQuoted
      ? `"${Command.escapeQuoted(what.text)}"`
      : Command.escape(what.text);
  }

  /**
   * Escape text, making it safe to use in commands
   */
  static escape(text: string): string {
    return text
      .replaceAll("\n", "\\n")
      .replaceAll("\r", "\\r")
      .replaceAll('"', '\\"');
  }

  /**
   * Escape text, with the assumption that it will be enclosed in quotes
   */
  static escapeQuoted(text: string): string {
    return text.replaceAll('"', '\\"');
  }

  /**
   * Unescape text, converting it to its original form after it has been
   * transmitted in a command
   */
  static unescape(text: string): string {
    return text
      .replaceAll("\\n", "\n")
      .replaceAll("\\r", "\r")
      .replaceAll('\\"', '"');
  }
}
