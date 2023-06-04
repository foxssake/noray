/* eslint-disable */
import { HostRepository } from '../hosts/host.repository.mjs'
/* eslint-enable */
import assert from 'node:assert'
import logger from '../logger.mjs'

/**
* @param {HostRepository} hostRepository
*/
export function handleConnect (hostRepository) {
  /**
  * @param {ProtocolServer} server
  */
  return function (server) {
    server.on('connect', (data, socket) => {
      const log = logger.child({ name: 'cmd:connect' })

      const oid = data
      const host = hostRepository.find(oid)
      log.debug(
        { oid, client: socket.address() },
        'Client attempting to connect to host'
      )
      assert(host, 'Unknown host oid: ' + oid)

      const hostAddress = stringifyAddress(host.socket.address())
      const clientAddress = stringifyAddress(socket.address())
      server.send(socket, 'connect', hostAddress)
      server.send(host.socket, 'connect', clientAddress)
      log.debug(
        { client: clientAddress, host: hostAddress, oid },
        'Connected client to host'
      )
    })
  }
}

function stringifyAddress (address) {
  return `${address.address}:${address.port}`
}
