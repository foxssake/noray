import * as nanoid from "nanoid";
import { config } from "../config.ts";
import { generateWordId } from "../utils.ts";

const generateOID = config.wordsOid.enabled
  ? () => generateWordId(config.wordsOid.length)
  : nanoid.customAlphabet(config.oid.charset, config.oid.length);
const generatePID = nanoid.customAlphabet(
  config.pid.charset,
  config.pid.length,
);

/**
 * Host entity.
 *
 * Hosts register in advance for other players to connect to them.
 */
export interface HostEntity {
  /**
   * Open id.
   */
  oid: string;

  /**
   * Private id.
   */
  pid: string;

  /**
   * Socket.
   */
  socket: Bun.Socket;

  /**
   * Relay port.
   */
  relay: number | undefined;

  /**
   * Host's address open for UDP.
   *
   * This is the public address where the host receives UDP traffic.
   */
  remoteAddress: string | undefined;

  /**
   * Host's port open for UDP.
   *
   * This is the public port where the host receives UDP traffic.
   */
  remotePort: number | undefined;
}

export function makeHost(socket: Bun.Socket): HostEntity {
  return {
    socket,
    oid: generateOID(),
    pid: generatePID(),

    relay: undefined,
    remoteAddress: undefined,
    remotePort: undefined,
  };
}
