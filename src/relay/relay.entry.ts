import { NetAddress } from "./net.address";
import { time } from "../utils";

export interface RelayEntryData {
  /**
   * The port on which we've received traffic
   */
  port: number;

  /**
   * The target address where traffic should be forwarded
   */
  address: NetAddress;
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
  lastSent = 0;

  /**
   * Time the relay last received traffic on its port.
   */
  lastReceived = 0;

  /**
   * Time the relay was created.
   */
  created = time();

  /**
   * Construct entry
   */
  constructor(options: RelayEntryData) {
    this.port = options.port;
    this.address = options.address;
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
