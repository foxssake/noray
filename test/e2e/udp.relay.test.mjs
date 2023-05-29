import { describe, it, after, before } from 'node:test'
import assert from 'node:assert'
import { End2EndContext } from './context.mjs'
import dgram from 'node:dgram'
import { UDPRelayHandler } from '../../src/relay/udp.relay.handler.mjs'
import { RelayEntry } from '../../src/relay/relay.entry.mjs'
import { NetAddress } from '../../src/relay/net.address.mjs'
import { sleep } from '../../src/utils.mjs'
import { UDPSocketPool } from '../../src/relay/udp.socket.pool.mjs'

describe('UDP Relay', { concurrency: false, skip: true }, async () => {
  const context = new End2EndContext()

  /** @type {dgram.Socket} */
  let sendSocket
  /** @type {dgram.Socket} */
  let recvSocket
  /** @type {UDPRelayHandler} */
  let relayHandler
  /** @type {UDPSocketPool} */
  let socketPool

  before(async () => {
    await context.startup()

    sendSocket = dgram.createSocket('udp4')
    recvSocket = dgram.createSocket('udp4')
    relayHandler = new UDPRelayHandler()
    socketPool = relayHandler.socketPool
  })

  it('should relay traffic', async () => {
    // Given
    const recvData = []
    const message = Buffer.from('Hello!', 'utf8')

    context.log.info('Creating test sockets')

    recvSocket.once('message', (msg, rinfo) =>
        recvData.push({ msg, rinfo })
    )

    await Promise.all([bindSocket(sendSocket), bindSocket(recvSocket)])

    context.log.info(
      'Allocated ports %d and %d',
      sendSocket.address().port, recvSocket.address().port
    )

    context.log.info('Creating relay')

    await relayHandler.createRelay(new RelayEntry({
      address: NetAddress.fromRinfo(sendSocket.address()),
      port: await socketPool.allocatePort()
    }))

    await relayHandler.createRelay(new RelayEntry({
      address: NetAddress.fromRinfo(recvSocket.address()),
      port: await socketPool.allocatePort()
    }))

    context.log.info(
      { table: relayHandler.relayTable },
      'Updated relay table'
    )

    // When
    sendSocket.send(message, relayHandler.relayTable[1].port, '127.0.0.1')
    await sleep(0.25)

    // Then
    context.log.info({ recvData }, 'Received data')
    assert.deepEqual(recvData[0]?.msg, message)
    assert.equal(recvData[0].rinfo.address, '127.0.0.1')
    assert.equal(recvData[0].rinfo.port, relayHandler.relayTable[0].port)
  })

  after(() => {
    sendSocket.close()
    recvSocket.close()
    relayHandler.clear()

    context.shutdown()
  })
})

/**
* Bind socket but with promise.
* @param {dgram.Socket} socket
* @returns {Promise<void>}
*/
function bindSocket (socket, port) {
  return new Promise((resolve, reject) => {
    socket.bind(port, '127.0.0.1', resolve)
    socket.once('error', reject)
  })
}
