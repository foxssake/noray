import { Command, type CommandSpec } from "@lib/command.js";
import { ReactorExchange, makeDefaultIdGenerator } from "@lib/reactor.js";

export class TestingExchange extends ReactorExchange<string> {
  public outbox: Array<[string, CommandSpec]> = [];
  public inbox: Array<CommandSpec> = [];

  constructor(source = "", command?: Command) {
    super(
      source,
      (what, to) => {
        this.outbox ??= [];
        this.outbox.push([to, what]);
      },
      (what, source) => new TestingExchange(source, new Command(what)),
      () => {},
      makeDefaultIdGenerator(),
      command,
    );
  }

  push(what: Command): void {
    this.inbox ??= [];
    this.inbox.push(what);
    super.push(what);
  }
}
