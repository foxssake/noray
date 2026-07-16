import logger from "../../logger.mjs";
import { Command, type CommandDataChunk, type CommandSpec } from "./command.ts";
import {
  ParamsConvention,
  RequestResponseConvention,
  StreamConvention,
} from "./conventions.ts";
import { BufferOverflowError, UnexpectedCharacterError } from "./errors.ts";

const log = logger.child({ name: "trimsock:reader" });

/*
 * Converts the ingested data into either command lines that can be parsed, or
 * raw command data
 */
class CommandReader {
  public maxSize = 16384;

  private buffer = Buffer.of();
  private at = 0;
  private isQuote = false;
  private isEscape = false;

  ingest(data: Buffer) {
    log.trace({ data: data.toString("utf8") }, "Ingesting data");
    const newSize = this.buffer.byteLength + data.byteLength;
    if (newSize > this.maxSize) {
      this.buffer = Buffer.of();

      log.trace(
        { data: data.toString("utf8") },
        "Data too big for buffer, rejecting with overflow",
      );
      throw new BufferOverflowError(
        `Buffer overflow! New size ${newSize} exceeds ${this.maxSize}!`,
      );
    }

    log.trace(
      { buffer: this.buffer.toString("utf8") },
      "Appended ingested data to buffer",
    );
    this.buffer = Buffer.concat([this.buffer, data]);
  }

  readLine(): string | undefined {
    // Extract a command, if it's terminated
    for (; !this.eob; ++this.at) {
      if (this.isEscape) {
        this.isEscape = false;
        continue;
      }

      if (this.char === '"') this.isQuote = !this.isQuote;
      if (this.char === "\\") {
        this.isEscape = true;
        continue;
      }
      if (this.char === "\n" && !this.isQuote) {
        const result = this.buffer.subarray(0, this.at).toString("utf8");
        ++this.at;
        this.flush();
        return result;
      }
    }
  }

  readRaw(size: number): Buffer | undefined {
    // Reset line parser
    this.isEscape = false;
    this.isQuote = false;

    if (this.buffer.length >= size) {
      const result = this.buffer.subarray(0, size);
      this.at = size + 1;
      this.flush();

      return result;
    }
  }

  private flush() {
    this.buffer = this.buffer.subarray(this.at);
    this.at = 0;
  }

  private get byte() {
    return this.buffer[this.at];
  }

  private get char() {
    return String.fromCodePoint(this.byte);
  }

  private get eob() {
    return this.at >= this.buffer.length;
  }
}

/*
 * Takes an extracted command line and parses it
 */
class CommandParser {
  private line = "";
  private at = 0;

  parse(line: string): CommandSpec {
    this.rewind(line);

    // Empty command
    if (this.atEnd) return { name: "", text: "", chunks: [] };

    const isRaw = this.char === "\r";
    if (isRaw) this.at++;

    const name = this.readName();
    this.at++;

    const chunks: CommandDataChunk[] = [];
    while (!this.atEnd && this.char !== "\n") chunks.push(this.readChunk());

    const text = chunks.map((it) => it.text).join("");

    return isRaw
      ? this.unescape({ name, text, raw: Buffer.of() })
      : this.unescape({ name, text, chunks });
  }

  private unescape(command: CommandSpec): CommandSpec {
    const result: CommandSpec = { name: Command.unescape(command.name) };
    if (command.chunks) {
      result.chunks = command.chunks.map((it) => ({
        ...it,
        text: Command.unescape(it.text),
      }));
      result.text = result.chunks.map((it) => it.text).join("");
    }

    return {
      ...command,
      ...result,
    };
  }

  private rewind(line: string) {
    this.line = line;
    this.at = 0;
  }

  private readName(): string {
    if (this.char === '"') return this.readQuoted();

    return this.readIdentifier();
  }

  private readChunk(): CommandDataChunk {
    if (this.char === '"') return { isQuoted: true, text: this.readQuoted() };

    return { isQuoted: false, text: this.readUnquoted() };
  }

  private readIdentifier(): string {
    const from = this.at;
    for (; this.char !== " " && !this.atEnd; ++this.at);
    return this.line.substring(from, this.at);
  }

  private readUnquoted(): string {
    const from = this.at;

    for (; ; ++this.at) {
      if (this.char === "\\") {
        this.at++;
        continue;
      }
      if (this.char === "\n" || this.char === '"') break;
      if (this.atEnd) break;
    }

    return this.line.substring(from, this.at);
  }

  private readQuoted(): string {
    const from = this.at;

    for (this.at++; ; ++this.at) {
      if (this.char === "\\") {
        this.at++;
        continue;
      }
      if (this.char === '"') {
        this.at++;
        break;
      }
      if (this.atEnd)
        throw new UnexpectedCharacterError(
          "Unexpected EOF while reading quoted!",
        );
    }

    return this.line.substring(from + 1, this.at - 1);
  }

  private get char(): string {
    return this.line[this.at];
  }

  private get atEnd(): boolean {
    return this.at >= this.line.length;
  }
}

/**
 * Parses incoming data as trimsock commands
 *
 * It can handle full or partial commands, making it suitable for ingesting data
 * streams as-is.
 *
 * If an error occurs during parsing ( e.g. an ill-formed command is encountered
 * ), it will throw an error.
 *
 * @see {@link TrimsockReader.ingest | ingest()} for ingesting data
 * @see {@link TrimsockReader.read | read()} for extracting commands from
 * ingested data
 * @category Parser
 */
export class TrimsockReader {
  /**
   * Upper limit on the internal buffer's size
   *
   * When calling {@link TrimsockReader.ingest | ingest()}, the data is stored in
   * a buffer until {@link TrimsockReader.read | read()} is called, and a full
   * command can be extracted.
   *
   * If this size limit is exceeded, the buffer's contents are discarded and a
   * {@link BufferOverflowError} is thrown.
   */
  public maxSize = 16384;

  private reader = new CommandReader();
  private parser = new CommandParser();

  private queuedRawCommand?: CommandSpec;
  private queuedRawSize = -1;

  private conventions = [
    new ParamsConvention(),
    new RequestResponseConvention(),
    new StreamConvention(),
  ];

  /**
   * Ingest incoming data, preparing it for parsing
   *
   * @see {link TrimsockReader.maxSize}
   */
  ingest(data: Buffer | string) {
    this.reader.maxSize = this.maxSize;

    if (typeof data === "string") this.reader.ingest(Buffer.from(data, "utf8"));
    else this.reader.ingest(data);
  }

  /**
   * Try and extract a command from the ingested data
   *
   * @returns the extracted command, or undefined
   */
  read(): CommandSpec | undefined {
    let command = this.pop();

    log.trace({ command }, "Applying conventions to command");
    if (command)
      for (const convention of this.conventions)
        command = convention.process(command);
    log.trace({ command }, "Applyied conventions to command");

    return command;
  }

  /**
   * Iterate through all the extractable commands
   */
  *commands() {
    while (true) {
      const command = this.read();
      if (!command) break;
      yield command;
    }
  }

  /**
   * Disable conventions, parsing messages as per the core specification
   */
  disableConventions() {
    this.conventions = [];
  }

  private pop(): CommandSpec | undefined {
    if (this.queuedRawCommand !== undefined) {
      const data = this.reader.readRaw(this.queuedRawSize);
      if (!data) return;

      const result: CommandSpec = {
        name: this.queuedRawCommand.name,
        raw: data,
      };

      this.queuedRawCommand = undefined;
      log.trace({ command: result }, "Popped raw command");
      return result;
    }

    const line = this.reader.readLine();
    if (line === undefined) return;

    const command = this.parser.parse(line);
    if (command.raw !== undefined) {
      this.queuedRawCommand = command;
      this.queuedRawSize = Number.parseInt(command.text ?? "");
      return this.read();
    }

    log.trace({ command }, "Popped command");
    return command;
  }
}
