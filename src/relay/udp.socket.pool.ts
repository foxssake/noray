import assert from "node:assert";

export type UDPSocket = Bun.udp.Socket<"buffer">;
export type UDPSocketOptions = Bun.udp.SocketOptions<"buffer">;

/**
 * Class to manage and allocate UDP ports as needed.
 *
 * The socket pool is used during UDP relaying. We need to both listen on and
 * send traffic through multiple ports during relay. The socket pool ensures
 * that these sockets are always available.
 *
 * This is a low-level interface, concerned only with the allocation, storage
 * and deallocation of ports and by extension, UDP sockets.
 */
export class UDPSocketPool {
  /**
   * Port to socket
   * @type {Map<number, dgram.Socket>}
   */
  private sockets = new Map<number, UDPSocket>();

  /**
   * Free ports
   * @type {number[]}
   */
  private freePorts = [] as number[];

  /**
   * Allocate a new port for relaying.
   *
   * If port is unset or 0, a random port will be picked by the OS.
   * @param port Port to allocate
   * @returns Allocated port
   * @throws if allocation fails
   */
  async allocatePort(
    port?: number,
    options: UDPSocketOptions = {},
  ): Promise<number> {
    const socket = await Bun.udpSocket({ ...options, port });
    return this.addSocket(socket);
  }

  /**
   * Close the socket associated with the given port.
   *
   * Does nothing if the port is not managed by the relay.
   * @param port Port
   */
  deallocatePort(port: number) {
    this.sockets.get(port)?.close();
    this.sockets.delete(port);
    this.freePorts = this.freePorts.filter((p) => p !== port);
  }

  /**
   * Get socket listening on port.
   * @param port Port
   */
  getSocket(port: number): UDPSocket | undefined {
    return this.sockets.get(port);
  }

  /**
   * Add an already listening socket to use for relaying.
   * @param socket Socket
   * @returns Relay port
   */
  addSocket(socket: UDPSocket): number {
    const port = socket.port;
    this.sockets.set(port, socket);
    this.freePorts.push(port);

    return port;
  }

  /**
   * Get a free port to use for relaying.
   *
   * The resulting port can be converted into a socket using `getSocket`.
   * @throws if no free ports are available
   */
  getPort(): number {
    assert(this.freePorts.length > 0, "No more free ports!");
    return this.freePorts.pop()!;
  }

  /**
   * Returns a port to the pool.
   *
   * After this call, the port can be reused. Does nothing if the port is not
   * managed by the relay.
   */
  returnPort(port: number) {
    if (!this.sockets.has(port)) {
      return;
    }

    this.freePorts.push(port);
  }

  /**
   * Check if there are any free ports in the pool.
   *
   * @returns True if there's a free port, false otherwise
   */
  hasFreePort(): boolean {
    return this.freePorts.length > 0;
  }

  /**
   * Close all sockets managed by this pool, freeing up all associated system
   * resources.
   */
  clear() {
    [...this.sockets.keys()].forEach((port) => this.deallocatePort(port));
  }

  /**
   * Allocated ports.
   */
  get ports(): number[] {
    return [...this.sockets.keys()];
  }
}
