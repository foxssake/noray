/* eslint-disable */
import { HostRepository } from './host.repository.mjs'
import { NodeSocketReactor } from '@foxssake/trimsock-node'
/* eslint-enable */
import { HostEntity } from './host.entity.mjs'
import logger from '../logger.mjs'
import * as prometheus from 'prom-client'
import { metricsRegistry } from '../metrics/metrics.registry.mjs'

const activeHostsGauge = new prometheus.Gauge({
  name: 'noray_active_hosts',
  help: 'Number of currently active hosts',
  registers: [metricsRegistry]
})

/**
* @param {HostRepository} hostRepository
*/
export function handleRegisterHost (hostRepository) {
  /**
  * @param {NodeSocketReactor} server
  */
  return function (server) {
    server.on('register-host', (__, exchange) => {
      const log = logger.child({ name: 'cmd:register-host' })
      activeHostsGauge.inc()

      const socket = exchange.source
      const host = new HostEntity({ socket })
      hostRepository.add(host)

      exchange.send({ name: 'set-oid', params: [host.oid] })
      exchange.send({ name: 'set-pid', params: [host.pid] })

      log.info(
        { oid: host.oid, pid: host.pid },
        'Registered host from address %s:%d',
        socket.remoteAddress, socket.remotePort
      )

      socket.on('error', err => {
        log.error(err)
      })

      socket.on('close', () => {
        log.info(
          { oid: host.oid, pid: host.pid },
          'Host disconnected, removing from repository'
        )
        hostRepository.removeItem(host)
        activeHostsGauge.dec()
      })
    })
  }
}
