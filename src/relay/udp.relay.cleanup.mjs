/* eslint-disable */
import { UDPRelayHandler } from './udp.relay.handler.mjs'
/* eslint-enable */
import { time } from '../utils.mjs'
import * as prometheus from 'prom-client'
import { metricsRegistry } from '../metrics/metrics.registry.mjs'

const expiredRelayCounter = new prometheus.Counter({
  name: 'noray_relay_expired',
  help: 'Count of expired relays',
  registers: [metricsRegistry]
})

/**
* Remove idle relays.
* @param {UDPRelayHandler} relayHandler Relay handler
* @param {number} timeout Maximum relay age in seconds
*/
export function cleanupUdpRelayTable (relayHandler, timeout) {
  const timeCutoff = time() - timeout

  relayHandler.relayTable
    .map(relay => [relay, Math.max(relay.lastSent, relay.lastReceived)])
    .filter(([_, lastTraffic]) => lastTraffic <= timeCutoff)
    .forEach(([relay, _]) => {
      relayHandler.freeRelay(relay)
      expiredRelayCounter.inc()
    })
}
