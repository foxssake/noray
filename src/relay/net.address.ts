// TODO: Stick to interface, methods are probably only needed for data lookups

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
}
