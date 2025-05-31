/* eslint-disable */
import { NetAddress } from './net.address.mjs'
import { UDPRelayHandler } from './udp.relay.handler.mjs'
/* eslint-enable */
import logger from '../logger.mjs'
import { RelayEntry } from './relay.entry.mjs'

const log = logger.child({ name: 'DynamicRelaying' })

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
  /** @type {Map<string, Buffer[]>} */
  #buffers = new Map()

  /**
  * Apply dynamic relay creation to relay handler.
  * @param {UDPRelayHandler} relayHandler Relay handler
  */
  apply (relayHandler) {
    relayHandler.on('drop',
      (senderRelay, targetRelay, senderAddress, targetPort, message) =>
        this.#handle(relayHandler, senderRelay, targetRelay, senderAddress, targetPort, message)
    )
  }

  /**
  * @param {UDPRelayHandler} relayHandler
  * @param {RelayEntry} senderRelay
  * @param {RelayEntry} targetRelay
  * @param {NetAddress} senderAddress
  * @param {number} targetPort
  * @param {Buffer} message
  */
  async #handle (relayHandler, senderRelay, targetRelay, senderAddress, targetPort, message) {
    // Unknown host or client already has relay, ignore
    if (senderRelay || !targetRelay) {
      return
    }

    const key = senderAddress.toString() + '>' + targetPort

    // We're already buffering for client, save data end return
    if (this.#buffers.has(key)) {
      this.#buffers.get(key).push(message)
      return
    }

    // No buffer for client yet, start buffering and create relay
    log.info(
      { from: senderAddress, to: targetRelay.address },
      'Creating dynamic relay'
    )
    this.#buffers.set(key, [message])
    const port = relayHandler.socketPool.getPort()
    const relay = new RelayEntry({
      address: senderAddress,
      port
    })
    await relayHandler.createRelay(relay)

    log.info(
      { relay },
      'Relay created, sending %d packets',
      this.#buffers.get(key)?.length ?? 0
    )
    this.#buffers.get(key)?.forEach(msg =>
      relayHandler.relay(msg, senderAddress, targetPort)
    )

    this.#buffers.delete(key)
  }
}

/**
* Apply dynamic relaying to relay handler.
* @param {UDPRelayHandler} relayHandler Relay handler
*/
export function useDynamicRelay (relayHandler) {
  new DynamicRelaying().apply(relayHandler)
}
