import { HostRepository } from "../hosts/host.repository.ts";
import dgram from "node:dgram";
import assert from "node:assert";
import logger from "../logger.ts";
import * as prometheus from "prom-client";
import { metricsRegistry } from "../metrics/metrics.registry.ts";

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
  socket?: dgram.Socket;
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
  public readonly socket: dgram.Socket;

  private hostRepository: HostRepository;

  constructor(options: UDPRemoteRegistrarOptions) {
    this.hostRepository = options.hostRepository;
    this.socket = options.socket ?? dgram.createSocket("udp4");
  }

  /**
   * Start listening for incoming requests.
   */
  listen(port = 0, address = "0.0.0.0"): Promise<void> {
    return new Promise((resolve) => {
      this.socket.on("message", (msg, rinfo) => this.handle(msg, rinfo));
      this.socket.bind(port, address, () => {
        const address = this.socket.address();
        log.info("Listening on %s:%s", address.address, address.port);
        resolve();
      });
    });
  }

  private async handle(msg: Buffer, rinfo: dgram.RemoteInfo) {
    try {
      const pid = msg.toString("utf8");
      log.debug({ pid, rinfo }, "Received UDP relay request");

      const host = this.hostRepository.findByPid(pid);
      assert(host, "Unknown host pid!");

      if (host.rinfo) {
        // Host has already remote info registered
        this.socket.send("OK", rinfo.port, rinfo.address);
        registerRepatCounter.inc();
        return;
      }

      host.rinfo = rinfo;
      this.socket.send("OK", rinfo.port, rinfo.address);
      registerSuccessCounter.inc();
    } catch (e) {
      registerFailCounter.inc();
      const message = e instanceof Error ? e.message : "Error";
      this.socket.send(message, rinfo.port, rinfo.address);
    }
  }
}
