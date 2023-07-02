import { describe, it } from 'node:test'
import assert from 'node:assert'
import sinon from 'sinon'
import { RelayEntry } from '../../../src/relay/relay.entry.mjs'
import { NetAddress } from '../../../src/relay/net.address.mjs'
import { UDPRelayHandler } from '../../../src/relay/udp.relay.handler.mjs'
import { time } from '../../../src/utils.mjs'
import { constrainGlobalBandwidth, constrainIndividualBandwidth, constrainLifetime, constrainTraffic } from '../../../src/relay/constraints.mjs'

describe('Relay constraints', () => {
  describe('constrainIndividualBandwidth', () => {
    it('should pass', () => {
      // Given
      const relayTable = [
        new RelayEntry({
          address: new NetAddress({ address: '37.89.0.5', port: 32467 }),
          port: 10001
        }),

        new RelayEntry({
          address: new NetAddress({ address: '57.13.0.9', port: 45357 }),
          port: 10002
        }),
      ]

      const message = Buffer.from('a'.repeat(16))

      const relayHandler = sinon.createStubInstance(UDPRelayHandler)
      relayHandler.on.callThrough()
      relayHandler.emit.callThrough()

      constrainIndividualBandwidth(relayHandler, 16)

      // When + Then
      assert.doesNotThrow(() =>
        relayHandler.emit('transmit', relayTable[0], relayTable[1], message)
      )
    })

    it('should throw on too much data', () => {
      // Given
      const relayTable = [
        new RelayEntry({
          address: new NetAddress({ address: '37.89.0.5', port: 32467 }),
          port: 10001
        }),

        new RelayEntry({
          address: new NetAddress({ address: '57.13.0.9', port: 45357 }),
          port: 10002
        }),
      ]

      const message = Buffer.from('a'.repeat(32))

      const relayHandler = sinon.createStubInstance(UDPRelayHandler)
      relayHandler.on.callThrough()
      relayHandler.emit.callThrough()

      constrainIndividualBandwidth(relayHandler, 16)

      // When + Then
      assert.throws(() =>
        relayHandler.emit('transmit', relayTable[0], relayTable[1], message)
      )
    })
  })

  describe('constrainGlobalBandwidth', () => {
    it('should pass', () => {
      // Given
      const relayTable = [
        new RelayEntry({
          address: new NetAddress({ address: '37.89.0.5', port: 32467 }),
          port: 10001
        }),

        new RelayEntry({
          address: new NetAddress({ address: '57.13.0.9', port: 45357 }),
          port: 10002
        }),
      ]

      const message = Buffer.from('a'.repeat(4))

      const relayHandler = sinon.createStubInstance(UDPRelayHandler)
      relayHandler.on.callThrough()
      relayHandler.emit.callThrough()

      constrainGlobalBandwidth(relayHandler, 16)

      // When + Then
      assert.doesNotThrow(() =>
        relayHandler.emit('transmit', relayTable[0], relayTable[1], message)
      )
      assert.doesNotThrow(() =>
        relayHandler.emit('transmit', relayTable[1], relayTable[0], message)
      )
    })

    it('should throw', () => {
      // Given
      const relayTable = [
        new RelayEntry({
          address: new NetAddress({ address: '37.89.0.5', port: 32467 }),
          port: 10001
        }),

        new RelayEntry({
          address: new NetAddress({ address: '57.13.0.9', port: 45357 }),
          port: 10002
        }),
      ]

      const message = Buffer.from('a'.repeat(12))

      const relayHandler = sinon.createStubInstance(UDPRelayHandler)
      relayHandler.on.callThrough()
      relayHandler.emit.callThrough()

      constrainGlobalBandwidth(relayHandler, 16)

      // When + Then
      assert.doesNotThrow(() =>
        relayHandler.emit('transmit', relayTable[0], relayTable[1], message)
      )
      assert.throws(() =>
        relayHandler.emit('transmit', relayTable[1], relayTable[0], message)
      )
    })
  })

  describe('constrainLifetime', () => {
    it('should pass', () => {
      // Given
      const relayTable = [
        new RelayEntry({
          address: new NetAddress({ address: '37.89.0.5', port: 32467 }),
          port: 10001,
          created: time()
        }),

        new RelayEntry({
          address: new NetAddress({ address: '57.13.0.9', port: 45357 }),
          port: 10002
        }),
      ]

      const message = Buffer.from('a'.repeat(4))

      const relayHandler = sinon.createStubInstance(UDPRelayHandler)
      relayHandler.on.callThrough()
      relayHandler.emit.callThrough()

      constrainLifetime(relayHandler, 4)

      // When + Then
      assert.doesNotThrow(() =>
        relayHandler.emit('transmit', relayTable[0], relayTable[1], message)
      )
    })

    it('should throw', () => {
      // Given
      const relayTable = [
        new RelayEntry({
          address: new NetAddress({ address: '37.89.0.5', port: 32467 }),
          port: 10001,
          created: time() - 16
        }),

        new RelayEntry({
          address: new NetAddress({ address: '57.13.0.9', port: 45357 }),
          port: 10002
        }),
      ]

      const message = Buffer.from('a'.repeat(4))

      const relayHandler = sinon.createStubInstance(UDPRelayHandler)
      relayHandler.on.callThrough()
      relayHandler.emit.callThrough()

      constrainLifetime(relayHandler, 4)

      // When + Then
      assert.throws(() =>
        relayHandler.emit('transmit', relayTable[0], relayTable[1], message)
      )
    })
  })

  describe('constrainTraffic', () => {
    it('should pass', () => {
      // Given
      const relayTable = [
        new RelayEntry({
          address: new NetAddress({ address: '37.89.0.5', port: 32467 }),
          port: 10001
        }),

        new RelayEntry({
          address: new NetAddress({ address: '57.13.0.9', port: 45357 }),
          port: 10002
        }),
      ]

      const message = Buffer.from('a'.repeat(4))

      const relayHandler = sinon.createStubInstance(UDPRelayHandler)
      relayHandler.on.callThrough()
      relayHandler.emit.callThrough()

      constrainTraffic(relayHandler, 16)

      // When + Then
      assert.doesNotThrow(() =>
        relayHandler.emit('transmit', relayTable[0], relayTable[1], message)
      )
      assert.doesNotThrow(() =>
        relayHandler.emit('transmit', relayTable[1], relayTable[0], message)
      )
    })

    it('should throw', () => {
      // Given
      const relayTable = [
        new RelayEntry({
          address: new NetAddress({ address: '37.89.0.5', port: 32467 }),
          port: 10001
        }),

        new RelayEntry({
          address: new NetAddress({ address: '57.13.0.9', port: 45357 }),
          port: 10002
        }),
      ]

      const message = Buffer.from('a'.repeat(12))

      const relayHandler = sinon.createStubInstance(UDPRelayHandler)
      relayHandler.on.callThrough()
      relayHandler.emit.callThrough()

      constrainTraffic(relayHandler, 16)

      // When + Then
      assert.doesNotThrow(() =>
        relayHandler.emit('transmit', relayTable[0], relayTable[1], message)
      )
      assert.doesNotThrow(() =>
        relayHandler.emit('transmit', relayTable[1], relayTable[0], message)
      )
      assert.throws(() =>
        relayHandler.emit('transmit', relayTable[1], relayTable[0], message)
      )
    })
  })
})
