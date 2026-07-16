import * as net from "node:net";
import { Reactor } from "../../trimsock-js/index.ts";

/**
 * Reactor adapter for [node.js' sockets].
 *
 * It can be initialized either as a server using {@link serve | serve()}, or
 * or a client using {@link connect | connect()}.
 *
 * [node.js' sockets]: https://nodejs.org/api/net.html
 *
 * @see {@link Reactor}
 */
export class NodeSocketReactor extends Reactor<net.Socket> {
  /**
   * Start a server
   *
   * Creates a listening socket by calling [net.createServer()]. Every new
   * connection will be read by the Reactor, to handle incoming commands.
   *
   * [net.createServer()]: https://nodejs.org/api/net.html#netcreateserveroptions-connectionlistener
   *
   * @param options server options
   * @param connectionListener connection listener callback
   * @returns the created server
   */
  public serve(
    options?: net.ServerOpts,
    connectionListener?: (socket: net.Socket) => void,
  ): net.Server {
    return net
      .createServer(options, connectionListener)
      .on("connection", (socket: net.Socket) => {
        socket.on("data", (data: Buffer) => this.ingest(data, socket));
      });
  }

  /**
   * Connect to a peer
   *
   * Creates a socket and connects it by calling [net.createConnection()].
   * Incoming commands will be parsed and handled by the Reactor.
   *
   * [net.createConnection()]: https://nodejs.org/api/net.html#netcreateconnection
   *
   * @param options connect options
   * @returns the created socket
   */
  public connect(
    options: net.NetConnectOpts,
    connectionListener?: () => void,
  ): net.Socket {
    const socket = net.createConnection(options, connectionListener);
    socket.on("data", (data: Buffer) => this.ingest(data, socket));

    return socket;
  }

  protected write(data: string, target: net.Socket): void {
    // TODO: Better error handling
    target.write(data, (err?) => {
      err && console.error(err);
    });
  }
}
