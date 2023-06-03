/* eslint-disable */
import * as net from 'node:net'
import { HostRepository } from './host.repository.mjs'
/* eslint-enable */
import { HostEntity } from './host.entity.mjs'
import logger from '../logger.mjs'

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

      const host = new HostEntity({ socket })
      hostRepository.add(host)

      server.send(socket, 'set-oid', host.oid)
      server.send(socket, 'set-pid', host.pid)

      log.info(
        { oid: host.oid, pid: host.pid },
        'Registered host from address %s:%d',
        socket.address().address, socket.address().port
      )

      socket.on('close', () => {
        log.info(
          { oid: host.oid, pid: host.pid },
          'Host disconnected, removing from repository'
        )
        hostRepository.removeItem(host)
      })
    })
  }
}
