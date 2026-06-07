import { NetAddress } from "./net.address.ts";
import { time } from "../utils.ts";

export interface RelayEntryData {
  /**
   * The port on which we've received traffic
   */
  port: number;

  /**
   * The target address where traffic should be forwarded
   */
  address: NetAddress;

  /**
   * Time the relay was last used to send data.
   */
  lastSent?: number;

  /**
   * Time the relay last received traffic on its port.
   */
  lastReceived?: number;

  /**
   * Time the relay was created.
   */
  created?: number;
}

/**
 * Entry for the relay translation tables.
 */
export class RelayEntry implements RelayEntryData {
  /**
   * The port on which we've received traffic
   */
  port: number;

  /**
   * The target address where traffic should be forwarded
   */
  address: NetAddress;

  /**
   * Time the relay was last used to send data.
   */
  lastSent: number;

  /**
   * Time the relay last received traffic on its port.
   */
  lastReceived: number;

  /**
   * Time the relay was created.
   */
  created: number;

  /**
   * Construct entry
   */
  constructor(options: RelayEntryData) {
    this.port = options.port;
    this.address = options.address;
    this.lastSent = options.lastSent ?? 0;
    this.lastReceived = options.lastReceived ?? 0;
    this.created = options.created ?? time();
  }

  /**
   * Check for equality
   */
  equals(other: RelayEntry): boolean {
    return this.address.equals(other.address);
  }

  /**
   * Relay identifier
   */
  get id(): string {
    return `${this.address}@${this.port}`;
  }
}
