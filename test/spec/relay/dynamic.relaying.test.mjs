import { beforeEach, afterEach, describe, it } from 'node:test'
import assert from 'node:assert'
import sinon from 'sinon'
import { UDPRelayHandler } from '../../../src/relay/udp.relay.handler.mjs'
import { sleep } from '../../../src/utils.mjs'
import { useDynamicRelay } from '../../../src/relay/dynamic.relaying.mjs'
import { RelayEntry } from '../../../src/relay/relay.entry.mjs'
import { NetAddress } from '../../../src/relay/net.address.mjs'
import { UDPSocketPool } from '../../../src/relay/udp.socket.pool.mjs'

describe('DynamicRelaying', () => {
  let clock

  beforeEach(() => {
    clock = sinon.useFakeTimers()
  })

  it('should create relay', async () => {
    // Given
    const socketPool = sinon.createStubInstance(UDPSocketPool)
    socketPool.getPort.returns(10000)

    const relayHandler = sinon.createStubInstance(UDPRelayHandler)
    relayHandler.on.callThrough()
    relayHandler.emit.callThrough()
    sinon.stub(relayHandler, 'socketPool').value(socketPool)

    relayHandler.createRelay.resolves(true)
    useDynamicRelay(relayHandler)

    const senderRelay = undefined
    const targetRelay = new RelayEntry({
      address: new NetAddress({ address: '87.54.0.16', port: 16752 }),
      port: 10007
    })
    const senderAddress = new NetAddress({ address: '97.32.4.16', port: 32775 })
    const targetPort = targetRelay.port
    const messages = [
      'hello', 'world', 'use', 'noray'
    ].map(message => Buffer.from(message))

    // When
    messages.forEach(message =>
      relayHandler.emit('drop', senderRelay, targetRelay, senderAddress, targetPort, message)
    )
    clock.restore()
    await sleep(0.05) // Wait for relay to be created
    clock = sinon.useFakeTimers()

    // Then
    const createdRelay = relayHandler.createRelay.lastCall.args[0]
    assert(createdRelay, 'Relay was not created!')
    assert.equal(createdRelay.address, senderAddress)
    assert.equal(createdRelay.port, 10000)

    const sent = relayHandler.relay.getCalls().map(call => call.args[0]?.toString())
    messages.forEach(message =>
      assert(
        sent.includes(message.toString()),
        `Message "${message.toString()}" was not sent!`
      )
    )
  })

  it('should ignore known sender', async () => {
    // Given
    const relayHandler = sinon.createStubInstance(UDPRelayHandler)
    relayHandler.on.callThrough()
    relayHandler.emit.callThrough()

    useDynamicRelay(relayHandler)

    const senderRelay = new RelayEntry({
      address: new NetAddress({ address: '87.54.0.16', port: 16752 }),
      port: 10007
    })

    const targetRelay = undefined
    const senderAddress = new NetAddress(senderRelay.address)
    const targetPort = 10057
    const messages = [
      'hello', 'world', 'use', 'noray'
    ].map(message => Buffer.from(message))

    // When
    messages.forEach(message =>
      relayHandler.emit('drop', senderRelay, targetRelay, senderAddress, targetPort, message)
    )
    clock.restore()
    await sleep(0.05) // Wait for relay to be created
    clock = sinon.useFakeTimers()

    // Then
    assert(relayHandler.createRelay.notCalled)
    assert(relayHandler.relay.notCalled)
  })

  it('should ignore unknown target', async () => {
    // Given
    const relayHandler = sinon.createStubInstance(UDPRelayHandler)
    relayHandler.on.callThrough()
    relayHandler.emit.callThrough()

    useDynamicRelay(relayHandler)

    const senderRelay = undefined
    const targetRelay = undefined
    const senderAddress = new NetAddress({ address: '87.54.0.16', port: 16752 })
    const targetPort = 10057
    const messages = [
      'hello', 'world', 'use', 'noray'
    ].map(message => Buffer.from(message))

    // When
    messages.forEach(message =>
      relayHandler.emit('drop', senderRelay, targetRelay, senderAddress, targetPort, message)
    )
    clock.restore()
    await sleep(0.05) // Wait for relay to be created
    clock = sinon.useFakeTimers()

    // Then
    assert(relayHandler.createRelay.notCalled)
    assert(relayHandler.relay.notCalled)
  })

  afterEach(() => {
    clock.restore()
  })
})
