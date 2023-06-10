/* eslint-disable */
import { UDPRelayHandler } from './udp.relay.handler.mjs'
import { HostRepository } from '../hosts/host.repository.mjs'
/* eslint-enable */
import dgram from 'node:dgram'
import assert from 'node:assert'
import { RelayEntry } from './relay.entry.mjs'
import { NetAddress } from './net.address.mjs'
import { requireParam } from '../assertions.mjs'
import logger from '../logger.mjs'

const log = logger.child({ name: 'UDPRemoteRegistrar' })

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
  /** @type {dgram.Socket} */
  #socket

  /** @type {HostRepository} */
  #hostRepository

  /** @type {UDPRelayHandler} */
  #udpRelayHandler

  /**
  * Construct instance.
  * @param {object} options Options
  * @param {HostRepository} options.hostRepository Host repository
  * @param {UDPRelayHandler} options.udpRelayHandler UDP relay handler
  * @param {dgram.Socket} [options.socket] Socket
  */
  constructor (options) {
    this.#hostRepository = requireParam(options.hostRepository)
    this.#udpRelayHandler = requireParam(options.udpRelayHandler)
    this.#socket = options.socket ?? dgram.createSocket('udp4')
  }

  /**
  * Start listening for incoming requests.
  * @param {number} [port=0] Port
  * @param {string} [address='0.0.0.0'] Address
  * @returns {Promise<void>}
  */
  listen (port, address) {
    return new Promise(resolve => {
      port ??= 0
      address ??= '0.0.0.0'

      this.#socket.on('message', (msg, rinfo) => this.#handle(msg, rinfo))
      this.#socket.bind(port, address, () => {
        const address = this.#socket.address()
        log.info('Listening on %s:%s', address.address, address.port)
        resolve()
      })
    })
  }

  /**
  * Socket listening for requests.
  * @type {dgram.Socket}
  */
  get socket () {
    return this.#socket
  }

  /**
  * @param {Buffer} msg
  * @param {dgram.RemoteInfo} rinfo
  */
  async #handle (msg, rinfo) {
    try {
      const pid = msg.toString('utf8')
      log.debug({ pid, rinfo }, 'Received UDP relay request')

      const host = this.#hostRepository.findByPid(pid)
      assert(host, 'Unknown host pid!')

      if (host.relay) {
        // Host has already a relay
        this.#socket.send('OK', rinfo.port, rinfo.address)
        return
      }

      host.rinfo = rinfo
      const port = await this.#udpRelayHandler.socketPool.allocatePort()
      host.relay = port
      await this.#udpRelayHandler.createRelay(new RelayEntry({
        address: NetAddress.fromRinfo(rinfo),
        port
      }))

      log.info(
        { host, port },
        'Created relay for host'
      )

      this.#socket.send('OK', rinfo.port, rinfo.address)
    } catch (e) {
      this.#socket.send(e.message ?? 'Error', rinfo.port, rinfo.address)
    }
  }
}
