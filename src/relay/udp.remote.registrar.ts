import { HostRepository } from "../hosts/host.repository.ts";
import logger from "../logger.ts";
import * as prometheus from "prom-client";
import { metricsRegistry } from "../metrics/metrics.registry.ts";
import { UDPSocket } from "./udp.socket.pool.ts";
import { assert } from "../assert.ts";

const log = logger.child({ name: "UDPRemoteRegistrar" });

const registerSuccessCounter = new prometheus.Counter({
  name: "noray_remote_registrar_success",
  help: "Number of successful remote address registrations",
  registers: [metricsRegistry],
});

const registerFailCounter = new prometheus.Counter({
  name: "noray_remote_registrar_fail",
  help: "Number of failed remote address registrations",
  registers: [metricsRegistry],
});

const registerRepatCounter = new prometheus.Counter({
  name: "noray_remote_registrar_repeat",
  help: "Number of redundant remote address registrations",
  registers: [metricsRegistry],
});

export interface UDPRemoteRegistrarOptions {
  hostRepository: HostRepository;
  socket?: UDPSocket;
}

/**
 * @summary Class for remote address registration over UDP.
 *
 * @description The UDP remote registrar will listen on a specific port for
 * incoming host ID's. If the host ID is valid, it will create a new relay
 * for that player and reply a packet saying 'OK'.
 *
 * Note that if the relay already exists, it will reply anyway, but will not
 * create duplicate relays. This helps combatting UDP's unreliable nature -
 * clients can just spam the request until they receive a reply.
 */
export class UDPRemoteRegistrar {
  /**
   * Socket listening for requests.
   */
  public readonly socket: UDPSocket | undefined;

  private hostRepository: HostRepository;

  constructor(options: UDPRemoteRegistrarOptions) {
    this.hostRepository = options.hostRepository;
    this.socket = options.socket;
  }

  /**
   * Start listening for incoming requests.
   */
  async listen(port = 0, address = "0.0.0.0"): Promise<void> {
    const server = await Bun.udpSocket({
      port,
      hostname: address,
      socket: {
        data: (_socket, data, port, address) => {
          this.handle(data, address, port);
        },
      },
    });

    log.info("Listening on %s:%s", server.address.address, server.address.port);
  }

  private async handle(
    msg: Buffer,
    incomingAddress: string,
    incomingPort: number,
  ) {
    if (this.socket === undefined) {
      // Should not happen, `handle()` is only called by the listening socket
      log.error("Trying to handle incoming request without active socket!");
      return;
    }

    try {
      const pid = msg.toString("utf8");
      log.debug(
        { pid, incomingAddress, incomingPort },
        "Received UDP relay request",
      );

      const host = this.hostRepository.findByPid(pid);
      assert(host, "Unknown host pid!");

      if (host.remoteAddress) {
        // Host has already remote info registered
        this.socket.send("OK", incomingPort, incomingAddress);
        registerRepatCounter.inc();
        return;
      }

      host.remoteAddress = incomingAddress;
      host.remotePort = incomingPort;
      this.socket.send("OK", incomingPort, incomingAddress);
      registerSuccessCounter.inc();
    } catch (e) {
      registerFailCounter.inc();
      const message = e instanceof Error ? e.message : "Error";
      this.socket.send(message, incomingPort, incomingAddress);
    }
  }
}
