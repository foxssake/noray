/* eslint-disable */
import { BandwidthLimiter } from './bandwidth.limiter.mjs'
import { UDPRelayHandler } from './udp.relay.handler.mjs'
/* eslint-enable */
import assert from 'node:assert'
import { time } from '../utils.mjs'

/**
* Limit the bandwidth on every relay individually.
* @param {UDPRelayHandler} relayHandler Relay handler
* @param {number} traffic Traffic limit in bytes/sec
* @param {number} [interval=1] Limit interval in seconds
*/
export function constrainIndividualBandwidth (relayHandler, traffic, interval) {
  const limiters = new Map()

  relayHandler.on('transmit', (source, _target, message) => {
    if (!limiters.has(source.id)) {
      limiters.set(source.id, new BandwidthLimiter({
        maxTraffic: traffic,
        interval: interval ?? 1
      }))
    }

    const limiter = limiters.get(source.id)
    limiter.validate(message.length)
  })

  relayHandler.on('destroy', relay => {
    limiters.delete(relay.id)
  })
}

/**
* Limit the bandwidth on every relay globally.
* @param {UDPRelayHandler} relayHandler Relay handler
* @param {number} traffic Traffic limit in bytes/sec
* @param {number} [interval=1] Limit interval in seconds
*/
export function constrainGlobalBandwidth (relayHandler, traffic, interval) {
  const limiter = new BandwidthLimiter({
    maxTraffic: traffic,
    interval: interval ?? 1
  })

  relayHandler.on('transmit', (_source, _target, message) => {
    limiter.validate(message.length)
  })
}

/**
* Block all traffic on relays after they've been active for a given duration.
* @param {UDPRelayHandler} relayHandler Relay handler
* @param {number} duration Duration in seconds
*/
export function constrainLifetime (relayHandler, duration) {
  relayHandler.on('transmit', (source, _target, _message) => {
    assert(time() - source.created < duration, 'Relay has hit lifetime duration limit!')
  })
}

/**
* Block all traffic on relays after they reached a given amount of traffic.
* @param {UDPRelayHandler} relayHandler Relay handler
* @param {number} traffic Maximum traffic in bytes
*/
export function constrainTraffic (relayHandler, traffic) {
  const relayTraffic = new Map()

  relayHandler.on('transmit', (source, _target, message) => {
    const id = source.id
    relayTraffic.set(id, (relayTraffic.get(id) ?? 0) + message.byteLength)
    assert(relayTraffic.get(id) < traffic, 'Relay has hit lifetime traffic limit!')
  })

  relayHandler.on('destroy', relay => {
    relayTraffic.delete(relay.id)
  })
}
