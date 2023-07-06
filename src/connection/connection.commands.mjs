/* eslint-disable */
import { ProtocolServer } from '../protocol/protocol.server.mjs'
import { HostRepository } from '../hosts/host.repository.mjs'
/* eslint-enable */
import assert from 'node:assert'
import logger from '../logger.mjs'
import { udpRelayHandler } from '../relay/relay.mjs'
import { RelayEntry } from '../relay/relay.entry.mjs'
import { NetAddress } from '../relay/net.address.mjs'

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
      const client = hostRepository.findBySocket(socket)
      log.debug(
        { oid, client: socket.address() },
        'Client attempting to connect to host'
      )
      assert(host, 'Unknown host oid: ' + oid)
      assert(host.rinfo, 'Host has no remote info registered!')
      assert(client, 'Unknown client from address')
      assert(client.rinfo, 'Client has no remote info registered!')

      const hostAddress = stringifyAddress(host.rinfo)
      const clientAddress = stringifyAddress(client.rinfo)
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
    server.on('connect-relay', async (data, socket) => {
      const log = logger.child({ name: 'cmd:connect-relay' })

      const oid = data
      const host = hostRepository.find(oid)
      const client = hostRepository.findBySocket(socket)
      log.debug(
        { oid, client: `${socket.remoteAddress}:${socket.remotePort}` },
        'Client attempting to connect to host'
      )
      assert(host, 'Unknown host oid: ' + oid)
      assert(client, 'Unknown client from address')

      log.debug('Ensuring relay for both parties')
      host.relay = await getRelay(host.rinfo)
      client.relay = await getRelay(client.rinfo)

      log.debug({ host: host.relay, client: client.relay }, 'Replying with relay')
      server.send(socket, 'connect-relay', host.relay)
      server.send(host.socket, 'connect-relay', client.relay)
      log.debug(
        { client: `${socket.remoteAddress}:${socket.remotePort}`, relay: host.relay, oid },
        'Connected client to host'
      )
    })
  }
}

function stringifyAddress (address) {
  return `${address.address}:${address.port}`
}

async function getRelay (rinfo) {
  // Attempt to create new relay on each connect
  // If there's a relay already, UDPRelayHandler will return that
  // If there's no relay, or it has expired, a new one will be created
  const log = logger.child({ name: 'getRelay' })
  log.trace({ rinfo }, 'Ensuring relay for remote')
  const relayEntry = await udpRelayHandler.createRelay(
    new RelayEntry({ address: NetAddress.fromRinfo(rinfo) })
  )

  log.trace({ relayEntry }, 'Created relay, returning with port %d', relayEntry.port)
  return relayEntry.port
}
