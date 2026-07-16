import { Reactor } from "@lib/reactor.js";

export class TestingReactor<T> extends Reactor<T> {
  readonly outbox: [T, string][] = [];

  protected write(data: string, target: T): void {
    this.outbox.push([target, data]);
  }
}
