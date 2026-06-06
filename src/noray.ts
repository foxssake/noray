import * as net from "node:net";
import { EventEmitter } from "node:events";
import logger from "./logger.ts";
import { config } from "./config.ts";
import { NodeSocketReactor } from "@foxssake/trimsock-node";
import { promiseEvent } from "./utils.ts";

export type NorayHook = (noray: Noray) => void;

const defaultModules = [
  "metrics/metrics.ts",
  "relay/relay.ts",
  "hosts/host.ts",
  "connection/connection.ts",
];

export class Noray extends EventEmitter {
  private server!: net.Server;
  private _reactor!: NodeSocketReactor;
  private log = logger;

  private static hooks: NorayHook[] = [];

  /**
   * Register a Noray configuration hook.
   */
  static hook(hok: NorayHook) {
    this.hooks.push(hok);
  }

  async start(modules: string[] = defaultModules): Promise<void> {
    modules ??= defaultModules;

    this.log.info("Starting Noray");

    this._reactor = new NodeSocketReactor().onError(
      (command, exchange, error) => {
        exchange.failOrSend({ name: command.name, text: "" + error });
      },
    );

    // Import modules for hooks
    for (const m of modules) {
      this.log.info("Pulling module %s for hooks", m);
      await import(`../src/${m}`);
    }

    // Run hooks
    this.log.info("Running %d hooks", Noray.hooks.length);
    const hookPromises = Noray.hooks.map((h) => h(this));
    this.log.info("Hooks launched");

    this.log.info("Waiting for hooks to finish");
    await Promise.all(hookPromises);

    // Start server
    this.log.info("Starting TCP server");
    this.server = this.reactor.serve();
    this.server.listen(config.socket.port, config.socket.host);
    this.server.on("listening", () => {
      this.log.info(
        "Listening on %s:%s",
        config.socket.host,
        config.socket.port,
      );

      this.server.on("error", (err) => {
        this.log.error("Listen socket encountered an error!");
        this.log.error(err);
      });

      this.server.on("connection", (conn) => {
        conn.on("error", (err) => {
          this.log.error("Connection socket encountered an error!");
          this.log.error(err);
        });
      });

      this.emit("listening", config.socket.port, config.socket.host);
    });

    await promiseEvent(this, "listening");
    this.log.info("Started noray in %f ms", process.uptime() * 1000.0);
  }

  shutdown() {
    this.log.info("Shutting down");

    this.emit("close");
    this.server.close();
  }

  get reactor() {
    return this._reactor;
  }
}
