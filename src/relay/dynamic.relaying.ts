import { NetAddress } from "./net.address.ts";
import { UDPRelayHandler } from "./udp.relay.handler.ts";
import logger from "../logger.ts";
import { RelayEntry } from "./relay.entry.ts";

const log = logger.child({ name: "DynamicRelaying" });

/**
 * Implementation for dynamic relaying.
 *
 * Whenever an unknown client tries to send data to a known host through its
 * relay address, dynamic relaying will create a new relay.
 *
 * While it's waiting for the relay to be created, it will buffer any incoming
 * data and send it all once the relay is created.
 */
export class DynamicRelaying {
  private buffers = new Map<string, Buffer[]>();

  /**
   * Apply dynamic relay creation to relay handler.
   */
  apply(relayHandler: UDPRelayHandler) {
    relayHandler.on(
      "drop",
      (senderRelay, targetRelay, senderAddress, targetPort, message) =>
        this.handle(
          relayHandler,
          senderRelay,
          targetRelay,
          senderAddress,
          targetPort,
          message,
        ),
    );
  }

  /**
   * @param {UDPRelayHandler} relayHandler
   * @param {RelayEntry} senderRelay
   * @param {RelayEntry} targetRelay
   * @param {NetAddress} senderAddress
   * @param {number} targetPort
   * @param {Buffer} message
   */
  private async handle(
    relayHandler: UDPRelayHandler,
    senderRelay: RelayEntry,
    targetRelay: RelayEntry,
    senderAddress: NetAddress,
    targetPort: number,
    message: Buffer,
  ) {
    // Unknown host or client already has relay, ignore
    if (senderRelay || !targetRelay) {
      return;
    }

    const key = senderAddress.toString() + ">" + targetPort;

    // We're already buffering for client, save data end return
    if (this.buffers.has(key)) {
      this.buffers.get(key)?.push(message);
      return;
    }

    // No buffer for client yet, start buffering and create relay
    log.info(
      { from: senderAddress, to: targetRelay.address },
      "Creating dynamic relay",
    );
    this.buffers.set(key, [message]);
    const port = relayHandler.socketPool.getPort();
    const relay = new RelayEntry({
      address: senderAddress,
      port,
    });
    relayHandler.createRelay(relay);

    log.info(
      { relay },
      "Relay created, sending %d packets",
      this.buffers.get(key)?.length ?? 0,
    );
    this.buffers
      .get(key)
      ?.forEach((msg) => relayHandler.relay(msg, senderAddress, targetPort));

    this.buffers.delete(key);
  }
}

/**
 * Apply dynamic relaying to relay handler.
 */
export function useDynamicRelay(relayHandler: UDPRelayHandler) {
  new DynamicRelaying().apply(relayHandler);
}
