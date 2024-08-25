/* eslint-disable */
import { HostRepository } from './host.repository.mjs'
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
  * @param {ProtocolServer} server
  */
  return function (server) {
    server.on('register-host', (_data, socket) => {
      const log = logger.child({ name: 'cmd:register-host' })
      activeHostsGauge.inc()

      const host = new HostEntity({ socket })
      hostRepository.add(host)

      server.send(socket, 'set-oid', host.oid)
      server.send(socket, 'set-pid', host.pid)

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
