/* eslint-disable */
import { RelayEntry } from './relay.entry.mjs'
/* eslint-enable */
import { NetAddress } from './net.address.mjs'
import { UDPSocketPool } from './udp.socket.pool.mjs'
import { time } from '../utils.mjs'
import { EventEmitter } from 'node:events'
import logger from '../logger.mjs'
import * as prometheus from 'prom-client'
import { metricsRegistry } from '../metrics/metrics.registry.mjs'

const log = logger.child({ name: 'UDPRelayHandler' })

const relayDurationHistogram = new prometheus.Histogram({
  name: 'noray_relay_duration',
  help: 'Time it takes to relay a packet',
  registers: [metricsRegistry]
})

const relaySizeHistorgram = new prometheus.Histogram({
  name: 'noray_relay_size',
  help: 'Size of the packet being relayed',
  registers: [metricsRegistry]
})

const relayDropCounter = new prometheus.Counter({
  name: 'noray_relay_drop_count',
  help: 'Number of relay packets dropped',
  registers: [metricsRegistry]
})

const activeRelayGauge = new prometheus.Gauge({
  name: 'noray_relay_count',
  help: 'Count of currently active relays',
  registers: [metricsRegistry]
})

/**
* Class implementing the actual relay logic.
*
* The relay handler keeps an internal table of relay entries and a socket pool.
*
* Whenever a new relay is added, the socket pool ensures that we have the
* necessary local port allocated to listen for incoming traffic on that port.
*
* When traffic arrives on any of the listening ports, it is first checked in
* the translation table. If there's an entry both for the sender AND target,
* the traffic is forwarded as-is, through the port dedicated to the sender.
*
* Example: Port 1 is allocated for Host, port 2 is allocated for Client. When
* we get a packet targeting port 1 from Client, we use port 2 to relay the data
* to Host. This way, Client will always appear as Noray:2 to the Host.
*/
export class UDPRelayHandler extends EventEmitter {
  /** @type {UDPSocketPool} */
  #socketPool

  /** @type {RelayEntry[]} */
  #relayTable = []

  /**
  * Construct instance.
  * @param {object} options Options
  * @param {UDPSocketPool} [options.socketPool] Socket pool
  */
  constructor (options) {
    super()

    this.#socketPool = options?.socketPool ?? new UDPSocketPool()
  }

  /**
  * Create a relay entry.
  *
  * If there's already a relay for the address, returns that.
  * NOTE: This modifies the incoming relay and returns the same instance.
  * @param {RelayEntry} relay Relay
  * @return {Promise<RelayEntry>} Resulting relay
  * @fires UDPRelayHandler#create
  */
  createRelay (relay) {
    log.debug({ relay }, 'Creating relay')
    if (this.hasRelay(relay)) {
      // We already have this relay entry
      log.trace({ relay }, 'Relay already exists, ignoring')
      return this.#relayTable.find(e => e.equals(relay))
    }

    relay.port = this.#socketPool.getPort()
    this.emit('create', relay)

    const socket = this.#socketPool.getSocket(relay.port)
    socket.removeAllListeners('message')
      .on('message', (msg, rinfo) => {
        this.relay(msg, NetAddress.fromRinfo(rinfo), relay.port)
      })

    relay.lastReceived = time()
    relay.created = time()
    this.#relayTable.push(relay)
    log.trace({ relay }, 'Relay created')

    activeRelayGauge.inc()

    return relay
  }

  /**
  * Check if relay already exists in the table.
  *
  * NOTE: This only compares the addresses, not the allocated port.
  * @param {RelayEntry} relay Relay
  * @returns {boolean} True if relay already exists
  */
  hasRelay (relay) {
    return this.#relayTable.find(e => e.equals(relay)) !== undefined
  }

  /**
  * Free a relay entry, removing it from the table and freeing any associated resources.
  * @param {RelayEntry} relay Relay
  * @returns {boolean} True if a relay was freed
  * @fires UDPRelayHandler#destroy
  */
  freeRelay (relay) {
    const idx = this.#relayTable.findIndex(e => e.equals(relay))
    if (idx < 0) {
      return false
    }

    this.emit('destroy', relay)

    this.#socketPool.returnPort(relay.port)
    this.#relayTable = this.#relayTable.filter((_, i) => i !== idx)

    activeRelayGauge.dec()

    return true
  }

  /**
  * Free all relay entries.
  */
  clear () {
    this.relayTable.forEach(entry => this.freeRelay(entry))

    activeRelayGauge.reset()
  }

  /**
  * Relay a message from a given sender to target.
  * @param {Buffer} msg Message
  * @param {NetAddress} sender Sender address
  * @param {number} target Target port
  * @returns {Promise<boolean>} True on success
  * @fires UDPRelayHandler#transmit
  * @fires UDPRelayHandler#drop
  */
  relay (msg, sender, target) {
    const measure = relayDurationHistogram.startTimer()

    const senderRelay = this.#relayTable.find(r =>
      r.address.port === sender.port && r.address.address === sender.address
    )
    const targetRelay = this.#relayTable.find(r => r.port === target)

    if (!senderRelay || !targetRelay) {
      // We don't have a relay for the sender, target, or both
      this.emit('drop', senderRelay, targetRelay, sender, target, msg)

      relayDropCounter.inc()
      measure()

      return false
    }

    const socket = this.#socketPool.getSocket(senderRelay.port)
    if (!socket) {
      // For some reason we don't have the socket
      return false
    }

    this.emit('transmit', senderRelay, targetRelay, msg)

    socket.send(msg, targetRelay.address.port, targetRelay.address.address)

    // Keep track of traffic timings
    senderRelay.lastReceived = time()
    targetRelay.lastSent = time()

    relaySizeHistorgram.observe(msg?.byteLength ?? 0)
    measure()

    return true
  }

  /**
  * Socket pool used for relays.
  * @type {UDPSocketPool}
  */
  get socketPool () {
    return this.#socketPool
  }

  /**
  * Relay table used for relays.
  * @type {RelayEntry[]}
  */
  get relayTable () {
    return [...this.#relayTable]
  }
}

/**
* Relay creation event.
*
* This is emitted *before* the relay is pushed, giving the handler a change to
* reject by throwing.
* @event UDPRelayHandler#create
* @param {RelayEntry} relay Relay entry
*/

/**
* Relay transmission event.
*
* This event is emitted *before* the packet is transmitted from the source
* relay to the target relay.
* @event UDPRelayHandler#transmit
* @param {RelayEntry} sourceRelay Source relay
* @param {RelayEntry} targetRelay Target relay
* @param {Buffer} message Message
*/

/**
* Relay destroy event.
*
* This event is emitted *before* a relay and its associated resources are
* freed.
* @event UDPRelayHandler#destroy
* @param {RelayEntry} relay Relay being freed.
*/

/**
* Relay drop event.
*
* This event is emitted when a packet arrives for relay that we can't transfer
* - usually because of an unknown node ( either sender or target).
* @event UDPRelayHandler#drop
* @param {RelayEntry} sourceRelay Source relay
* @param {RelayEntry} targetRelay Target relay
* @param {NetAddress} sourceAddress Source address
* @param {number} targetPort Target port
* @param {Buffer} message Message
*/
