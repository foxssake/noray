import logger from "../../src/logger.ts";
import { Noray } from "../../src/noray.ts";
import { sleep } from "../../src/utils.ts";
import { config } from "../../src/config.ts";
import { assert } from "../../src/assert.ts";
import { UDPSocket } from "../../src/relay/udp.socket.pool.ts";

const READ_WAIT = 0.05;

export type ClientSocket = Bun.Socket<Buffer>;

export class End2EndContext {
  private clients: ClientSocket[] = [];

  noray!: Noray;
  log = logger.child({ name: "test" });

  // TODO: Start an actual, separate process, and return some handle to it
  async startup(): Promise<void> {
    this.log.info("Starting app");

    this.noray = new Noray();
    await this.noray.start();

    this.log.info("Startup done, ready for testing");
  }

  // TODO: Use actual trimsock clients instead
  async connect(): Promise<ClientSocket> {
    const socket = await Bun.connect({
      hostname: config.socket.host,
      port: config.socket.port,
      data: Buffer.from([]),
      socket: {
        data(socket, data) {
          // Concat incoming data to socket buffer
          socket.data = Buffer.concat([socket.data, data]);
        },
      },
    });

    this.clients.push(socket);
    return socket;
  }

  async read(socket: ClientSocket): Promise<string[]> {
    while (socket.data.length == 0) await sleep(READ_WAIT);

    const text = socket.data.toString("utf-8");
    const lines = text.split("\n");

    this.log.debug({ text }, "Read data from noray");
    return lines;
  }

  /**
   * Register external port with the remote registrar
   *
   * @returns external port
   */
  async registerExternal(pid: string, throwaway = false): Promise<UDPSocket> {
    let done = false;
    let error;
    const udp = await Bun.udpSocket({
      socket: {
        data(_socket, data) {
          const msg = data.toString("utf-8");
          done = true;
          error = msg !== "OK" && msg;
        },
      },
    });

    for (let i = 0; i < 128 && !done; ++i) {
      udp.send(pid, config.udpRelay.registrarPort, config.socket.host);
      this.log.debug("Sending remote registrar attempt #%d", i + 1);
      await sleep(0.1);
    }

    if (!done) {
      throw new Error("Registrar timed out!");
    } else if (error) {
      throw new Error(error);
    }

    if (throwaway) udp.close();

    return udp;
  }

  /**
   * Register host.
   *
   * @returns [OID, PID] tuple
   */
  async registerHost(socket: ClientSocket): Promise<[string, string]> {
    socket.write("register-host\n");

    const data = await this.read(socket);

    const oid = data
      .filter((cmd) => cmd.startsWith("set-oid "))
      .map((cmd) => cmd.split(" ")[1])
      .at(0);

    const pid = data
      .filter((cmd) => cmd.startsWith("set-pid "))
      .map((cmd) => cmd.split(" ")[1])
      .at(0);

    assert(oid, "No OID received!");
    assert(pid, "No PID received!");

    return [oid, pid];
  }

  shutdown() {
    this.log.info("Closing %d connections", this.clients.length);
    this.clients.forEach((c) => c.close());

    this.log.info("Terminating Noray");
    this.noray.shutdown();
  }
}
