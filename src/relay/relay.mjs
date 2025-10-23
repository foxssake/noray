import { config } from '../config.mjs'
import { constrainGlobalBandwidth, constrainIndividualBandwidth, constrainLifetime, constrainTraffic } from './constraints.mjs'
import { UDPRelayHandler } from './udp.relay.handler.mjs'
import { Noray } from '../noray.mjs'
import { cleanupUdpRelayTable } from './udp.relay.cleanup.mjs'
import logger from '../logger.mjs'
import { formatByteSize, formatDuration } from '../utils.mjs'
import { UDPRemoteRegistrar } from './udp.remote.registrar.mjs'
import { hostRepository } from '../hosts/host.mjs'
import { useDynamicRelay } from './dynamic.relaying.mjs'
import { UDPSocketPool } from './udp.socket.pool.mjs'

export const udpSocketPool = new UDPSocketPool()

export const udpRelayHandler = new UDPRelayHandler({ socketPool: udpSocketPool })

export const udpRemoteRegistrar = new UDPRemoteRegistrar({
  hostRepository,
  udpRelayHandler
})
const log = logger.child({ name: 'mod:relay' })

Noray.hook(async noray => {
  log.info(
    'Starting periodic UDP relay cleanup job, running every %s',
    formatDuration(config.udpRelay.cleanupInterval)
  )
  const cleanupJob = setInterval(
    () => cleanupUdpRelayTable(udpRelayHandler, config.udpRelay.timeout),
    config.udpRelay.cleanupInterval * 1000
  )

  log.info('Listening on port %d for UDP remote registrars', config.udpRelay.registrarPort)
  udpRemoteRegistrar.listen(config.udpRelay.registrarPort)

  log.info('Binding %d ports for relaying', config.udpRelay.ports.length)

  for (const port of config.udpRelay.ports) {
    log.trace('Binding port %d for relay', port)
    try {
      await udpSocketPool.allocatePort(port)
    } catch (err) {
      log.warn({ err }, 'Failed to bind port %d, ignoring', port)
    }
  }

  log.info(
    'Limiting relay bandwidth to %s/s and global bandwidth to %s/s',
    formatByteSize(config.udpRelay.maxIndividualTraffic),
    formatByteSize(config.udpRelay.maxGlobalTraffic)
  )

  constrainIndividualBandwidth(
    udpRelayHandler, config.udpRelay.maxIndividualTraffic, config.udpRelay.trafficInterval
  )
  constrainGlobalBandwidth(
    udpRelayHandler, config.udpRelay.maxGlobalTraffic, config.udpRelay.trafficInterval
  )

  log.info(
    'Blocking relay traffic after %s or %s',
    formatDuration(config.udpRelay.maxLifetimeDuration),
    formatByteSize(config.udpRelay.maxLifetimeTraffic)
  )

  constrainLifetime(udpRelayHandler, config.udpRelay.maxLifetimeDuration)
  constrainTraffic(udpRelayHandler, config.udpRelay.maxLifetimeTraffic)

  log.info('Applying dynamic relaying')
  useDynamicRelay(udpRelayHandler)

  log.info('Adding shutdown hooks')
  noray.on('close', () => {
    log.info('Noray shutting down, cancelling UDP relay cleanup job')
    clearInterval(cleanupJob)

    log.info('Closing UDP remote registrar socket')
    udpRemoteRegistrar.socket.close()

    log.info('Closing socket pool')
    udpSocketPool.clear()

    log.info('Closing relay handler')
    udpRelayHandler.clear()
  })
})
