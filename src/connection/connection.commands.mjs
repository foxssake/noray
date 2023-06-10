/* eslint-disable */
import { ProtocolServer } from '../protocol/protocol.server.mjs'
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
      assert(host.rinfo, 'Host has no remote info registered!')

      const hostAddress = stringifyAddress(host.rinfo)
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

/**
* @param {HostRepository} hostRepository
*/
export function handleConnectRelay (hostRepository) {
  /**
  * @param {ProtocolServer} server
  */
  return function (server) {
    server.on('connect-relay', (data, socket) => {
      const log = logger.child({ name: 'cmd:connect-relay' })

      const oid = data
      const host = hostRepository.find(oid)
      log.debug(
        { oid, client: socket.address() },
        'Client attempting to connect to host'
      )
      assert(host, 'Unknown host oid: ' + oid)
      log.debug({ relay: host.relay }, 'Asserting relay')
      assert(host.relay, 'Host has no relay!')

      log.debug({ relay: host.relay }, 'Replying with relay')
      server.send(socket, 'connect-relay', host.relay)
      log.debug(
        { client: stringifyAddress(socket.address()), relay: host.relay, oid },
        'Connected client to host'
      )
    })
  }
}

function stringifyAddress (address) {
  return `${address.address}:${address.port}`
}
