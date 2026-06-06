import * as net from "node:net";
import { Repository } from "../repository.ts";
import { type HostEntity } from "./host.entity.ts";

/**
 * Repository for tracking hosts.
 *
 * @extends {Repository<HostEntity>}
 */
export class HostRepository extends Repository<HostEntity> {
  constructor() {
    super((host) => host.oid);
  }

  /**
   * Find host by private id.
   */
  findByPid(pid: string): HostEntity | undefined {
    // TODO: Cache by PID
    return [...this.list()].find((host) => host.pid === pid);
  }

  /**
   * Find host by socket.
   * @param {net.Socket} socket Socket
   * @returns {HostEntity|undefined} Host
   */
  findBySocket(socket: net.Socket): HostEntity | undefined {
    // TODO: Cache by socket
    return [...this.list()].find((host) => host.socket === socket);
  }
}
