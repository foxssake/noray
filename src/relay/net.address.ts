import dgram from "node:dgram";
import net from "node:net";

export interface NetAddressData {
  address: string;
  port: number;
}

export class NetAddress implements NetAddressData {
  address: string;
  port: number;

  constructor(options: NetAddressData) {
    this.address = options.address;
    this.port = options.port;
  }

  equals(other: NetAddressData) {
    return this.address === other.address && this.port === other.port;
  }

  toString() {
    return `${this.address}:${this.port}`;
  }

  static fromRinfo(rinfo: dgram.RemoteInfo | net.AddressInfo): NetAddress {
    return new NetAddress({
      address: rinfo.address,
      port: rinfo.port,
    });
  }
}
