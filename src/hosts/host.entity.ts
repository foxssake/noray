import * as net from "node:net";
import * as dgram from "node:dgram";
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
  socket: net.Socket;

  /**
   * Relay port.
   */
  relay: number | undefined;

  /**
   * Host remote info.
   */
  rinfo: dgram.RemoteInfo | undefined;
}

export function makeHost(socket: net.Socket): HostEntity {
  return {
    socket,
    oid: generateOID(),
    pid: generatePID(),

    relay: undefined,
    rinfo: undefined,
  };
}
