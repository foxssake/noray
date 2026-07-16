import logger from "../../logger.mjs";
import assert from "./assert.ts";
import { Command, type CommandSpec } from "./command.ts";
import { TrimsockReader } from "./reader.ts";

const log = logger.child({ name: "trimsock:reactor" });

/**
 * Callback type for handling incoming commands
 * @category Reactor
 */
export type CommandHandler<T> = (
  command: Command,
  exchange: Exchange<T>,
) => void | Promise<void>;

/**
 * Callback type for command filters
 * @category Reactor
 */
export type CommandFilter<T> = (
  next: () => void | Promise<void>,
  command: Command,
  exchange: Exchange<T>,
) => void | Promise<void>;

/**
 * Callback type for handling errors resulting from failed command processing
 * @category Reactor
 */
export type CommandErrorHandler<T> = (
  command: Command,
  exchange: Exchange<T>,
  error: unknown,
) => void;

export type IngestErrorHandler = (
  error: unknown,
  input: string | Buffer,
) => void;

/**
 * Callback type for generating exchange ID's
 *
 * The resulting ID's must be unique for each active exchange, per peer. In
 * other words, two exchanges may have the same ID as long as only one of them
 * is active, and / or both exchanges belong to different peers.
 *
 * @see {@link makeDefaultIdGenerator}
 * @category Reactor
 */
export type ExchangeIdGenerator = () => string;

function generateCryptoId(length: number): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const buffer = new Uint8Array(~~length);
  crypto.getRandomValues(buffer);

  return [...buffer]
    .map((idx) => charset.charAt(idx % charset.length))
    .join("");
}

/**
 * Return the default exchange generator
 *
 * Its exact algorithm is an implementation detail and is free to change. Useful
 * when the default algorithm is needed, but with different ID lenghts.
 * @category Reactor
 */
export function makeDefaultIdGenerator(length = 16): ExchangeIdGenerator {
  return () => generateCryptoId(length);
}

/**
 * Read-only exchange
 *
 * @see {@link WritableExchange}
 * @see {@link Exchange}
 * @category Reactor
 */
export interface ReadableExchange {
  /**
   * Return the next {@link Command.isSimple | simple command}
   */
  onCommand(): Promise<CommandSpec>;

  /**
   * Return the next reply command
   */
  onReply(): Promise<CommandSpec>;

  /**
   * Return the next stream chunk or stream end command
   *
   * Note that stream commands are buffered until they are processed either by
   * `onStream()` or {@link chunks | chunks()}.
   */
  onStream(): Promise<CommandSpec>;

  /**
   * Iterate all stream chunks as they arrive
   *
   * Note that stream commands are buffered until they are processed either by
   * {@link onStream | onStream()} or `chunks()`.
   */
  chunks(): AsyncGenerator<CommandSpec>;
}

/**
 * Write-only exchange
 *
 * @typeParam T - connection type ( e.g. socket, stream, etc. )
 *
 * @see {@link ReadableExchange}
 * @see {@link Exchange}
 * @category Reactor
 */
export interface WritableExchange<T> {
  /**
   * Send a command
   *
   * The command will be sent in reference to the exchange's originating
   * command, by default to the originating command's sender.
   *
   * @param what command to send
   * @param to recipient
   */
  send(what: CommandSpec, to?: T): this;

  /**
   * Send a request
   *
   * The request will be sent over the exchange's connection, with a generated
   * request ID.
   *
   * @param what request command
   */
  request(what: CommandSpec): this;

  /**
   * Send a reply
   *
   * The sent command's name is empty to save on bandwidth. This closes the
   * exchange, meaning no more data will be sent over it. If the response needs
   * to be sent in multiple parts, consider using a {@link stream}.
   *
   * @throws if the exchange has no ID to reply to, or if the exchange was
   * already closed.
   *
   * @param what reply command to send
   */
  reply(what: Omit<CommandSpec, "name">): void;

  /**
   * Send a failure reply
   *
   * The sent command's name is empty to save on bandwidth. Use when the
   * incoming request wasn't processed successfully. This operation closes the
   * exchange, meaning no more data will be sent over it.
   *
   * @throws if the exchange has no ID to reply to, or if the exchange was
   * already closed.
   *
   * @param what failure command to send
   */
  fail(what: Omit<CommandSpec, "name">): void;

  // TODO: How to initiate a stream?
  /**
   * Stream a data chunk
   *
   * The sent command's name is empty to save on bandwidth. The stream ID is set
   * to the exchange's ID.
   *
   * @throws if the exchange has no ID to reply to, or if the exchange was
   * already closed.
   *
   * @param what stream command to send
   */
  stream(what: Omit<CommandSpec, "name" | "streamId">): void;

  /**
   * Finish stream
   *
   * Sends a stream end command. The stream ID is set to the exchange's ID. This
   * operation closes the exchange, meaning no more data will be sent over it.
   *
   * @throws if the exchange has no ID to reply to, or if the exchange was
   * already closed.
   */
  finishStream(): void;

  /**
   * Return true if the exchange can be replied to
   *
   * If this is true, data can be sent over the exchange, e.g. with
   * {@link reply | reply()}, {@link fail | fail()}, or
   * {@link stream | stream()}.
   */
  canReply(): boolean;

  /**
   * Reply if possible, otherwise send command
   *
   *
   * @param what command to send
   * @see {@link reply | reply()}
   * @see {@link send | send()}
   */
  replyOrSend(what: CommandSpec): void;

  /**
   * Fail if possible, otherwise send command
   *
   * @param what failure command to send
   * @see {@link fail | fail()}
   * @see {@link send | send()}
   */
  failOrSend(what: CommandSpec): void;
}

/**
 * Represents an exchange between two peers
 *
 * An exchange can be initiated by receiving a command, or by sending a command.
 * In either case, the initial command is stored and used to determine data for
 * future messages. For example, the original message's request ID is used for
 * sending replies. If the original message had no ID, no replies can be sent.
 *
 * An exchange becomes *closed* if a command transferred indicated that no
 * further commands are expected. For example, sending a reply closes the
 * exchange, as a reply indicates that the request has been processed, and the
 * exchange has served its purpose.
 *
 * Arriving commands are buffered until they are processed, e.g. with
 * {@link onReply | onReply()}, {@link onCommand | onCommand()}, etc.
 *
 * @typeParam T - connection type ( e.g. socket, stream, etc. )
 * @category Reactor
 */
export interface Exchange<T> extends ReadableExchange, WritableExchange<T> {
  readonly source: T;
}

export class ReactorExchange<T> implements Exchange<T> {
  private commandResolvers: Array<(command: Command) => void> = [];
  private replyResolvers: Array<(command: Command) => void> = [];
  private replyRejectors: Array<(command: Command) => void> = [];
  private streamResolvers: Array<(command: Command) => void> = [];
  private queued: Array<Command> = [];

  private isOpen = true;

  public readonly source: T;
  private write: (what: CommandSpec, to: T) => void;
  private requestExchange: (
    what: CommandSpec,
    source: T,
  ) => ThisType<ReactorExchange<T>>;
  private free: () => void;
  private generateExchangeId: ExchangeIdGenerator = makeDefaultIdGenerator();
  private command?: Command;

  constructor(
    source: T,
    write: (what: CommandSpec, to: T) => void,
    requestExchange: (
      what: CommandSpec,
      source: T,
    ) => ThisType<ReactorExchange<T>>,
    free: () => void,
    generateExchangeId: ExchangeIdGenerator = makeDefaultIdGenerator(),
    command?: Command,
  ) {
    this.source = source;
    this.write = write;
    this.requestExchange = requestExchange;
    this.free = free;
    this.generateExchangeId = generateExchangeId;
    this.command = command;

    // Process originating command
    if (this.command) this.push(this.command);

    // Don't queue simple commands for promises
    if (this.command?.isSimple) this.queued = [];
  }

  push(what: Command): void {
    if (what.isSuccessResponse) {
      if (this.replyResolvers.length > 0)
        for (const resolve of this.replyResolvers) resolve(what);
      else this.queued.push(what);

      this.close();
    } else if (what.isErrorResponse) {
      if (this.replyRejectors.length > 0)
        for (const reject of this.replyRejectors) reject(what);
      else this.queued.push(what);

      this.close();
    } else if (what.isStreamChunk || what.isStreamEnd) {
      if (this.streamResolvers.length > 0) {
        for (const resolve of this.streamResolvers) resolve(what);
        this.streamResolvers = [];
      } else this.queued.push(what);

      if (what.isStreamEnd) this.close();
    } else {
      if (this.commandResolvers.length > 0) {
        for (const resolve of this.commandResolvers) resolve(what);
        this.commandResolvers = [];
      } else this.queued.push(what);
    }
  }

  send(what: CommandSpec, to?: T): this {
    this.write(what, to ?? this.source);
    return this.requestExchange(what, to ?? this.source) as this;
  }

  request(what: CommandSpec): this {
    const req: CommandSpec = {
      ...what,
      isRequest: true,
      requestId: this.generateExchangeId(),
    };

    req.isSuccessResponse = undefined;
    req.isErrorResponse = undefined;
    req.isStreamChunk = undefined;
    req.isStreamEnd = undefined;

    return this.send(req);
  }

  canReply(): boolean {
    return this.command?.id !== undefined;
  }

  reply(what: Omit<CommandSpec, "name">): void {
    this.requireRepliable();
    this.requireOpen();

    const reply = {
      ...what,
      name: "",
      requestId: this.command?.requireId(),
      isSuccessResponse: true,
    };

    reply.isRequest = undefined;
    reply.isErrorResponse = undefined;
    reply.isStreamChunk = undefined;
    reply.isStreamEnd = undefined;

    this.write(reply, this.source);
    this.close();
  }

  replyOrSend(what: CommandSpec): void {
    if (this.canReply()) this.reply(what);
    else this.send(what);
  }

  fail(what: Omit<CommandSpec, "name">): void {
    this.requireRepliable();
    this.requireOpen();

    const reply = {
      ...what,
      name: "",
      requestId: this.command?.requireId(),
      isErrorResponse: true,
    };

    reply.isRequest = undefined;
    reply.isSuccessResponse = undefined;
    reply.isStreamChunk = undefined;
    reply.isStreamEnd = undefined;

    this.write(reply, this.source);
  }

  failOrSend(what: CommandSpec): void {
    if (this.canReply()) this.fail(what);
    else this.send(what);
  }

  stream(what: Omit<CommandSpec, "name" | "streamId">): void {
    this.requireRepliable();
    this.requireOpen();

    const stream = {
      ...what,
      name: "",
      streamId: this.command?.requireId(),
      isStreamChunk: true,
    };

    stream.isRequest = undefined;
    stream.isSuccessResponse = undefined;
    stream.isErrorResponse = undefined;
    stream.isStreamEnd = undefined;

    this.write(stream, this.source);
  }

  finishStream(): void {
    this.requireRepliable();
    this.requireOpen();

    this.write(
      {
        name: "",
        streamId: this.command?.requireId(),
        isStreamEnd: true,
      },
      this.source,
    );
    this.close();
  }

  onCommand(): Promise<CommandSpec> {
    const queued = this.queued.find(
      (cmd) =>
        !cmd.isRequest &&
        !cmd.isSuccessResponse &&
        !cmd.isErrorResponse &&
        !cmd.isStreamChunk &&
        !cmd.isStreamEnd,
    );
    this.queued = this.queued.filter((cmd) => cmd !== queued);

    if (queued) return Promise.resolve(queued);

    this.requireOpen();
    return new Promise((resolve) => {
      this.commandResolvers.push(resolve);
    });
  }

  onReply(): Promise<CommandSpec> {
    const queued = this.queued.find(
      (cmd) => cmd.isSuccessResponse || cmd.isErrorResponse,
    );
    this.queued = this.queued.filter((cmd) => cmd !== queued);

    if (queued?.isSuccessResponse === true) return Promise.resolve(queued);
    if (queued?.isErrorResponse === true) return Promise.reject(queued);

    this.requireOpen();
    return new Promise((resolve, reject) => {
      this.replyResolvers.push(resolve);
      this.replyRejectors.push(reject);
    });
  }

  onStream(): Promise<CommandSpec> {
    const queued = this.queued.find(
      (cmd) => cmd.isStreamChunk || cmd.isStreamEnd || cmd.isErrorResponse,
    );
    this.queued = this.queued.filter((cmd) => cmd !== queued);

    if (queued?.isErrorResponse === true) return Promise.reject(queued);
    if (queued) return Promise.resolve(queued);

    this.requireOpen();

    return new Promise((resolve, reject) => {
      this.streamResolvers.push(resolve);
      this.replyRejectors.push(reject);
    });
  }

  async *chunks(): AsyncGenerator<CommandSpec> {
    while (true) {
      const chunk = await this.onStream();
      if (chunk.isStreamEnd) break;

      yield chunk;
    }
  }

  private requireRepliable() {
    assert(this.canReply(), "No replies can be sent to this command!");
  }

  private requireOpen() {
    assert(this.isOpen, "Exchange is already closed!");
  }

  private clearPromises(): void {
    this.replyResolvers = [];
    this.replyRejectors = [];
    this.streamResolvers = [];
  }

  private close(): void {
    this.clearPromises();
    this.free();
    this.isOpen = false;
  }
}

export class ExchangeMap<T, E extends Exchange<T> = Exchange<T>> {
  private data: Map<string, Set<E>> = new Map();

  has(exchangeId: string, source: T): boolean {
    return this.get(exchangeId, source) !== undefined;
  }

  get(exchangeId: string, source: T): E | undefined {
    return this.data
      .get(exchangeId)
      ?.values()
      ?.find((it) => it.source === source);
  }

  set(exchangeId: string, exchange: E): void {
    const source = exchange.source;

    this.delete(exchangeId, source);

    const exchanges = this.data.get(exchangeId) ?? new Set();
    exchanges.add(exchange);
    this.data.set(exchangeId, exchanges);
  }

  delete(exchangeId: string, source: T): void {
    const exchanges = this.data.get(exchangeId);
    if (!exchanges) return;

    const item = exchanges.values().find((it) => it.source === source);
    if (item === undefined) return;

    exchanges.delete(item);
    if (exchanges.size === 0) this.data.delete(exchangeId);
  }
}

/**
 * Manages commands over multiple connections
 *
 * Reactors sit on top of one or multiple connections. Incoming data is parsed
 * and then dispatched to the appropriate handler registered using
 * {@link on | on()}.
 *
 * In response, commands can either be sent through the {@link Exchange}
 * instances passed to the handlers, or entirely new exchanges can be initiated
 * using {@link send | send()}.
 *
 * It also supports filters through {@link use | use()}, which enables the
 * registration of callbacks. Each of these filter callbacks receives the
 * command, exchange, and the next filter in the chain. The chain can also be
 * broken by simply not calling the next filter. Filters run for every incoming
 * command that doesn't already belong to an exchange.
 *
 * A single reactor can handle commands from an arbitrary amount of
 * connections - this is why `source` or `target` parameters appear in many
 * methods, specifying which connection to use.
 *
 * This is an abstract class, since trimsock is not tied to any specific
 * transport. Transport-specific implementations can be created by extending
 * this class and implementing {@link write | write()} for sending data, and
 * calling {@link ingest | ingest()} whenever data is received.
 *
 * @typeParam T - connection type ( e.g. socket, stream, etc. )
 * @category Reactor
 */
export abstract class Reactor<T> {
  private readers: Map<T, TrimsockReader> = new Map();
  private handlers: Map<string, CommandHandler<T>> = new Map();
  private defaultHandler: CommandHandler<T> = () => { };
  private errorHandler: CommandErrorHandler<T> = () => { };
  private ingestErrorHandler: IngestErrorHandler = () => { };
  private filters: CommandFilter<T>[] = [];

  private exchanges = new ExchangeMap<T, ReactorExchange<T>>();

  private makeReader: () => TrimsockReader = () => new TrimsockReader();
  private generateExchangeId: ExchangeIdGenerator = makeDefaultIdGenerator();

  constructor(
    makeReader: () => TrimsockReader = () => new TrimsockReader(),
    generateExchangeId: ExchangeIdGenerator = makeDefaultIdGenerator(),
  ) {
    this.makeReader = makeReader;
    this.generateExchangeId = generateExchangeId;
  }

  /**
   * Register a command handler
   *
   * Note that one command can only have one handler active at a time. Calling
   * this method will replace the currently active handler, if it exists.
   *
   * @param commandName command name
   * @param handler callback function
   */
  public on(commandName: string, handler: CommandHandler<T>): this {
    this.handlers.set(commandName, handler);
    return this;
  }

  /**
   * Register a handler for unknown commands
   *
   * Whenever a command is received that has no associated handler, the unknown
   * command handler is called.
   *
   * Note that there's only one handler at any time, calling this method will
   * replace the currently active handler.
   *
   * @param handler callback function
   */
  public onUnknown(handler: CommandHandler<T>): this {
    this.defaultHandler = handler;
    return this;
  }

  /**
   * Register an error handler
   *
   * Whenever an error occurs during command processing ( e.g. in one of the
   * registered handlers ), the error handler is called.
   *
   * Note that there's only one handler at any time, calling this method will
   * replace the currently active handler.
   *
   * @param handler callback function
   */
  public onError(handler: CommandErrorHandler<T>): this {
    this.errorHandler = handler;
    return this;
  }

  /**
   * Register an ingest error handler
   *
   * If the reactor receives input that it can't manage ( e.g. it's malformed or
   * the command is too long ), it rejects the command and calls the ingest error
   * handler.
   *
   * Note that there's only one handler at any time, calling this method will
   * replace the currently active handler.
   *
   * @param handler callback function
   */
  public onIngestError(handler: IngestErrorHandler): this {
    this.ingestErrorHandler = handler;
    return this;
  }

  /**
   * Register a new command filter
   *
   * Whenever the reactor ingests a command that doesn't belong to an existing
   * exchange, a new exchange is created and the filters are ran in order of
   * registration.
   *
   * @param filter filter callback
   */
  public use(filter: CommandFilter<T>): this {
    this.filters.push(filter);
    return this;
  }

  /**
  * Configure reactor using a callback
  *
  * Calls the callback with the reactor instance as parameter. Useful for
  * writing reusable methods that don't rely on the specific reactor to do
  * their job.
  *
  * @example Reusable error handler
  * ```
    function errorHandler<T>(): (reactor: Reactor<T>) => void {
      return (reactor) => {
        reactor.onError((cmd, exchange, error) =>
          exchange.failOrSend({
            name: "error",
            data: error + ""
          })
        )
      }
    }

    let reactor: Reactor<WebSocket>
    reactor.configure(errorHandler())
  * ```
  *
  * @param callback configurer callback
  */
  public configure(callback: (reactor: this) => void): this {
    callback(this);
    return this;
  }

  /**
   * Returns a list of all the commands handled by this reactor
   *
   * This list is extended whenever {@link on | on()} is called.
   */
  public get knownCommands(): string[] {
    return [...this.handlers.keys()];
  }

  /**
   * Attach a source to the reactor
   *
   * Note that this is an optimization step, to prepare in advance for ingesting
   * data from the given source. When ingesting data from an unknown source, it
   * will be attached during ingest.
   *
   * Attaching the same source multiple times will have no additional effects.
   */
  public attach(source: T): void {
    this.ensureReaderFor(source);
  }

  /**
   * Detach a source from the reactor
   *
   * This will free any resource associated to ingesting data from the source.
   */
  public detach(source: T): void {
    this.readers.delete(source);
  }

  // TODO: Protected
  /**
   * Pass a piece of incoming data to the reactor
   *
   * The data is parsed, and the appropriate handler is called.
   *
   * @param data incoming data
   * @param source source connection
   */
  public async ingest(data: Buffer | string, source: T): Promise<void> {
    try {
      log.trace({ data: data.toString("utf8") }, "Ingesting data");
      const reader = this.ensureReaderFor(source);

      if (typeof data === "string") reader.ingest(Buffer.from(data, "utf8"));
      else reader.ingest(data);

      await Promise.all(
        reader.commands().map((it) => this.handle(new Command(it), source)),
      );
    } catch (e) {
      log.trace(
        { data: data.toString("utf8"), error: e },
        "Failed ingesting data",
      );
      this.ingestErrorHandler(e, data);
    }
  }

  /**
   * Initiate an exchange by sending a message over a connection
   *
   * @param target connection to use for sending
   * @param spec command to send
   * @returns the new exchange
   */
  public send(target: T, spec: CommandSpec): Exchange<T> {
    log.trace(
      { command: spec, target: (target as any).remoteAddress },
      "Sending command",
    );
    const command = new Command(spec);
    this.write(command.serialize(), target);
    return this.ensureExchange(command, target);
  }

  /**
   * Send data over a target connection
   *
   * By this point, all data is serialized. This method's only responsibility is transmitting that data to the target.
   *
   * @param data serialized data to send
   * @param target target connection
   */
  protected abstract write(data: string, target: T): void;

  private async handle(command: Command, source: T): Promise<void> {
    const exchangeId = command.id;

    if (this.isNewExchange(command, source)) {
      log.trace(
        { command, source: (source as any).remoteAddress },
        "Received new exchange",
      );

      const handler = this.handlers.get(command.name) ?? this.defaultHandler;
      const exchange = this.ensureExchange(command, source);

      let filterIdx = 0;
      const next = async () => {
        if (filterIdx >= this.filters.length) {
          log.trace(
            { command, exchange: exchangeId, handler },
            "Applying handler",
          );
          await handler(command, exchange);
        } else {
          log.trace(
            {
              filterIdx,
              filter: this.filters[filterIdx],
              command,
              exchange: exchangeId,
            },
            "Applying filter",
          );
          filterIdx += 1;
          await this.filters[filterIdx - 1](next, command, exchange);
        }
      };

      try {
        await next();
      } catch (error) {
        log.trace(
          { command, exchange: exchangeId, error },
          "Error occurred during command handling",
        );
        this.errorHandler(command, exchange, error);
      }
    } else {
      const exchange =
        exchangeId !== undefined && this.exchanges.get(exchangeId, source);

      log.trace(
        { command, exchange: exchangeId, hasExchange: !!exchange },
        "Handling known exchange",
      );
      assert(exchange, `Unknown exchange id: ${exchangeId}!`);
      exchange.push(command);
    }
  }

  private isNewExchange(command: Command, source: T): boolean {
    const exchangeId = command.id;
    const hasExchangeId = exchangeId !== undefined;
    const knownExchange =
      hasExchangeId && this.exchanges.get(exchangeId, source);

    // Request-response
    if (command.isRequest) {
      log.trace({ command }, "Request command is missing its request id!");
      assert(hasExchangeId, "Request command is missing its request id!");
      return true;
    }
    if (command.isSuccessResponse || command.isErrorResponse) {
      log.trace({ command }, "Response command is missing its request id!");
      assert(hasExchangeId, "Response command is missing its request id!");
      return false;
    }

    // Streams
    if (command.isStreamChunk) {
      log.trace({ command }, "Stream chunk command is missing its request id!");
      assert(hasExchangeId, "Stream chunk command is missing its request id!");
      return knownExchange === undefined;
    }
    if (command.isStreamEnd) {
      // TODO(trimsock): Wrong error message?
      log.trace({ command }, "Stream chunk command is missing its request id!");
      assert(hasExchangeId, "Stream chunk command is missing its request id!");
      return false;
    }

    // Regular commands
    return true;
  }

  private findExchange(
    command: Command,
    source: T,
  ): ReactorExchange<T> | undefined {
    const id = command.requestId ?? command.streamId;
    return id !== undefined ? this.exchanges.get(id, source) : undefined;
  }

  private ensureExchange(command: Command, source: T): ReactorExchange<T> {
    const id = command.requestId ?? command.streamId;

    if (id === undefined) return this.makeExchange(command, source);

    const exchange =
      this.findExchange(command, source) ?? this.makeExchange(command, source);
    this.exchanges.set(id, exchange);
    return exchange;
  }

  private makeExchange(
    command: Command | undefined,
    source: T,
  ): ReactorExchange<T> {
    return new ReactorExchange(
      source,
      (cmd, to) => this.write(Command.serialize(cmd), to),
      (cmd, to) => this.ensureExchange(new Command(cmd), to),
      () => {
        const exchangeId = command?.requestId ?? command?.streamId;
        if (exchangeId !== undefined) this.exchanges.delete(exchangeId, source);
      },
      this.generateExchangeId,
      command,
    );
  }

  private ensureReaderFor(source: T): TrimsockReader {
    let reader = this.readers.get(source);
    if (reader === undefined) {
      reader = this.makeReader();
      this.readers.set(source, reader);
    }

    return reader;
  }
}
