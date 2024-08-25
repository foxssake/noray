import { describe, it } from 'node:test'
import assert from 'node:assert'
import sinon from 'sinon'
import dgram from 'node:dgram'
import { UDPSocketPool } from '../../../src/relay/udp.socket.pool.mjs'
import { RelayEntry } from '../../../src/relay/relay.entry.mjs'
import { NetAddress } from '../../../src/relay/net.address.mjs'
import { UDPRelayHandler } from '../../../src/relay/udp.relay.handler.mjs'

describe('UDPRelayHandler', () => {
  describe('createRelay', () => {
    it('should create relay', async () => {
      // Given
      const handler = sinon.stub()
      const socket = sinon.createStubInstance(dgram.Socket)
      const socketPool = sinon.createStubInstance(UDPSocketPool)
      socketPool.getPort.returns(10001)
      socketPool.getSocket.returns(socket)
      socket.removeAllListeners.returnsThis()

      const relay = new RelayEntry({
        address: new NetAddress({
          address: '88.57.0.107',
          port: '32279'
        })
      })

      const relayHandler = new UDPRelayHandler({
        socketPool
      })

      relayHandler.on('create', handler)

      // When
      const result = await relayHandler.createRelay(relay)

      // Then
      assert.deepEqual(relayHandler.relayTable, [relay])
      assert(relay.port, 'No port assigned to relay!')
      assert(handler.calledWith(relay), 'Create event not emitted!')
    })

    it('should ignore if relay exists', async () => {
      // Given
      const socket = sinon.createStubInstance(dgram.Socket)
      const socketPool = sinon.createStubInstance(UDPSocketPool)
      socketPool.getSocket.returns(socket)
      socket.removeAllListeners.returnsThis()

      const relay = new RelayEntry({
        address: new NetAddress({
          address: '88.57.0.107',
          port: '32279'
        })
      })

      const relayHandler = new UDPRelayHandler({
        socketPool
      })
      await relayHandler.createRelay(relay)

      // When
      const result = await relayHandler.createRelay(relay)

      // When
      assert.equal(result, relay)
      assert.deepEqual(relayHandler.relayTable, [relay])
    })
  })

  describe('freeRelay', () => {
    it('should free relay', async () => {
      // Given
      const handler = sinon.stub()
      const socket = sinon.createStubInstance(dgram.Socket)
      const socketPool = sinon.createStubInstance(UDPSocketPool)
      socketPool.getPort.returns(10001)
      socketPool.getSocket.returns(socket)
      socket.removeAllListeners.returnsThis()

      const relay = new RelayEntry({
        address: new NetAddress({
          address: '88.57.0.107',
          port: '32279'
        })
      })

      const relayHandler = new UDPRelayHandler({
        socketPool
      })
      await relayHandler.createRelay(relay)
      relayHandler.on('destroy', handler)

      // When
      const result = relayHandler.freeRelay(relay)

      // When
      assert.equal(result, true)
      assert(socketPool.returnPort.calledOnceWith(10001))
      assert.deepEqual(relayHandler.relayTable, [])
      assert(handler.calledWith(relay), 'Destroy event not emitted!')
    })

    it('should ignore unknown', async () => {
      // Given
      const socket = sinon.createStubInstance(dgram.Socket)
      const socketPool = sinon.createStubInstance(UDPSocketPool)
      socketPool.getSocket.returns(socket)
      socket.removeAllListeners.returnsThis()

      const relay = new RelayEntry({
        address: new NetAddress({
          address: '88.57.0.107',
          port: 32279
        })
      })

      const unknownRelay = new RelayEntry({
        address: new NetAddress({
          address: '89.45.0.109',
          port: 32279
        })
      })

      const relayHandler = new UDPRelayHandler({
        socketPool
      })
      await relayHandler.createRelay(relay)

      // When
      const result = relayHandler.freeRelay(unknownRelay)

      // When
      assert.equal(result, false)
      assert(socketPool.deallocatePort.notCalled)
      assert.deepEqual(relayHandler.relayTable, [relay])
    })
  })

  describe('relay', () => {
    it('should relay', async () => {
      // Given
      const message = Buffer.from('Hello!', 'utf-8')
      const socket = sinon.createStubInstance(dgram.Socket)
      const socketPool = sinon.createStubInstance(UDPSocketPool)
      socketPool.getPort.onFirstCall().returns(10001)
      socketPool.getPort.onSecondCall().returns(10002)
      socketPool.getSocket.returns(socket)
      socket.removeAllListeners.returnsThis()
      const handler = sinon.stub()

      const relayHandler = new UDPRelayHandler({
        socketPool
      })
      relayHandler.on('transmit', handler)

      await relayHandler.createRelay(new RelayEntry({
        address: new NetAddress({
          address: '88.57.0.17',
          port: 32279
        })
      }))

      await relayHandler.createRelay(new RelayEntry({
        address: new NetAddress({
          address: '88.59.62.107',
          port: 65227
        })
      }))
      socketPool.getSocket.resetHistory()

      // When
      const success = relayHandler.relay(message, new NetAddress({
        address: '88.59.62.107',
        port: 65227
      }), 10001)

      // Then
      assert(success, 'Relay failed!')
      assert(socketPool.getSocket.calledOnceWith(10002), 'Socket not queried!')
      assert(socket.send.calledWith(message), 'Message not sent!')
      assert(handler.calledOnce, 'Transmit event not emitted!')
    })

    it('should ignore unknown address', async () => {
      // Given
      const message = Buffer.from('Hello!', 'utf-8')
      const socket = sinon.createStubInstance(dgram.Socket)
      const socketPool = sinon.createStubInstance(UDPSocketPool)
      socketPool.getPort.onFirstCall().returns(10001)
      socketPool.getSocket.returns(socket)
      socket.removeAllListeners.returnsThis()

      const dropHandler = sinon.spy()

      const relayHandler = new UDPRelayHandler({
        socketPool
      })

      await relayHandler.createRelay(new RelayEntry({
        address: new NetAddress({
          address: '88.57.0.17',
          port: 32279
        })
      }))
      relayHandler.on('drop', dropHandler)
      socketPool.getSocket.resetHistory()

      // When
      const success = relayHandler.relay(message, new NetAddress({
        address: '88.59.62.107',
        port: 65227
      }), 10001)

      // Then
      assert(!success, 'Relay succeeded?')
      assert(socketPool.getSocket.notCalled, 'Socket queried!')
      assert(socket.send.notCalled, 'Message sent?')
      assert(dropHandler.calledOnce, 'Drop event not emitted!')
    })
    it('should ignore on missing socket', async () => {
      // Given
      const message = Buffer.from('Hello!', 'utf-8')
      const socket = sinon.createStubInstance(dgram.Socket)
      const socketPool = sinon.createStubInstance(UDPSocketPool)
      socketPool.getPort.onFirstCall().returns(10001)
      socketPool.getPort.onSecondCall().returns(10002)
      socketPool.getSocket.returns(socket)
      socket.removeAllListeners.returnsThis()

      const relayHandler = new UDPRelayHandler({
        socketPool
      })

      await relayHandler.createRelay(new RelayEntry({
        address: new NetAddress({
          address: '88.57.0.17',
          port: 32279
        })
      }))

      await relayHandler.createRelay(new RelayEntry({
        address: new NetAddress({
          address: '88.59.62.107',
          port: 65227
        })
      }))
      socketPool.getSocket.resetHistory()
      socketPool.getSocket.returns(undefined)

      // When
      const success = relayHandler.relay(message, new NetAddress({
        address: '88.59.62.107',
        port: 65227
      }), 10001)

      // Then
      assert(!success, 'Relay succeeded?')
      assert(socketPool.getSocket.called, 'Socket not queried!')
      assert(socket.send.notCalled, 'Message sent?')
    })
  })
  describe('hasRelay', () => {
    it('should not have relay', async () => {
      // Given
      const socket = sinon.createStubInstance(dgram.Socket)
      const socketPool = sinon.createStubInstance(UDPSocketPool)
      socketPool.getPort.returns(10001)
      socketPool.getPort.returns(10002)
      socketPool.getSocket.returns(socket)
      socket.removeAllListeners.returnsThis()

      const createdRelay = new RelayEntry({
        address: new NetAddress({
          address: '88.57.0.107',
          port: 32279
        })
      })

      const testRelay = new RelayEntry({
        address: new NetAddress({
          address: '88.57.0.107',
          port: 49152
        })
      })

      const relayHandler = new UDPRelayHandler({
        socketPool
      })

      await relayHandler.createRelay(createdRelay)

      // When + Then
      assert(!relayHandler.hasRelay(testRelay))
    })
    it('should have relay', async () => {
      // Given
      const socket = sinon.createStubInstance(dgram.Socket)
      const socketPool = sinon.createStubInstance(UDPSocketPool)
      socketPool.getPort.onFirstCall().returns(10001)
      socketPool.getPort.onSecondCall().returns(10002)
      socketPool.getSocket.returns(socket)
      socket.removeAllListeners.returnsThis()

      const createdRelay = new RelayEntry({
        address: new NetAddress({
          address: '88.57.0.107',
          port: 32279
        })
      })

      const testRelay = new RelayEntry({
        address: new NetAddress({
          address: '88.57.0.107',
          port: 32279
        })
      })
      const relayHandler = new UDPRelayHandler({
        socketPool
      })

      await relayHandler.createRelay(createdRelay)

      // When + Then
      assert(relayHandler.hasRelay(testRelay))
    })
  })
})
