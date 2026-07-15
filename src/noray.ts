import { EventEmitter } from "node:events";
import logger from "./logger.ts";
import { config } from "./config.ts";
import { BunSocketReactor } from "@foxssake/trimsock-bun";
import { NorayEvents } from "./events.ts";
import { version } from "./version.ts";

export type NorayHook = (noray: Noray) => void;

const defaultModules = [
  "metrics/metrics.ts",
  "relay/relay.ts",
  "hosts/host.ts",
  "connection/connection.ts",
];

export type NorayReactor = BunSocketReactor;

export class Noray extends EventEmitter {
  private server!: Bun.TCPSocketListener;
  private _reactor!: NorayReactor;
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

    this.log.info("Starting Noray v" + version);

    this._reactor = new BunSocketReactor().onError(
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
    this.server = this._reactor.listen({
      hostname: config.socket.host,
      port: config.socket.port,
      socket: {
        open: (socket) => {
          // Send a greeting message to new clients
          // This also lets us know that the TCP listen socket works as intended
          this._reactor.send(socket, {
            name: "hi",
            text: `noray v${version}`,
          });
        },

        error: (socket, error) => {
          this.log.error(
            {
              error,
              remoteAddress: socket.remoteAddress,
              remotePort: socket.remotePort,
            },
            "Connection socket encountered an error!",
          );
        },

        close: (socket) => {
          NorayEvents.emit("connection-close", socket);
        },
      },
    });

    this.emit("listening", config.socket.port, config.socket.host);
    this.log.info("Started noray in %f ms", process.uptime() * 1000.0);
  }

  shutdown() {
    this.log.info("Shutting down");

    this.emit("close");
    this.server.stop(true);

    this.log.info("Shutdown complete");
  }

  get reactor() {
    return this._reactor;
  }
}
