import { describe, it } from 'node:test'
import assert from 'node:assert'
import dgram from 'node:dgram'
import sinon from 'sinon'
import { UDPSocketPool } from '../../../src/relay/udp.socket.pool.mjs'

describe('UDPSocketPool', () => {
  describe ('allocatePort', () => {
    it('should allocate port', async () => {
      // Given
      const pool = new UDPSocketPool()

      // When + Then
      const port = await pool.allocatePort()

      // Finally
      pool.deallocatePort(port)
    })
  })

  describe ('addSocket', () => {
    it('should save port', () => {
      // Given
      const socket = sinon.createStubInstance(dgram.Socket)
      socket.address.returns({
        address: '127.0.0.1',
        port: 10001,
        family: 'ipv4'
      })
      const pool = new UDPSocketPool()

      // When
      pool.addSocket(socket)

      // Then
      assert.deepEqual(pool.ports, [10001])
      assert.equal(pool.getSocket(10001), socket)
    })
  })

  describe('deallocatePort', () => {
    it('should call close', () => {
      // Given
      const socket = sinon.createStubInstance(dgram.Socket)
      socket.address.returns({
        address: '0.0.0.0',
        port: 7879,
        family: 'IPv4'
      })

      const pool = new UDPSocketPool()
      pool.addSocket(socket)

      // When
      pool.deallocatePort(7879)

      // Then
      assert(socket.close.calledOnce)
      assert(!pool.ports.includes(7879))
    })

    it('should ignore unknown port', () => {
      // Given
      const socket = sinon.createStubInstance(dgram.Socket)
      socket.address.returns({
        address: '0.0.0.0',
        port: 7879,
        family: 'IPv4'
      })

      const pool = new UDPSocketPool()
      pool.addSocket(socket)

      // When
      pool.deallocatePort(7876)

      // Then
      assert(socket.close.notCalled)
    })
  })

  describe ('getPort', () => {
    it('should return allocated', async () => {
      // Given
      const pool = new UDPSocketPool()
      const expected = await pool.allocatePort()

      // When
      const actual = pool.getPort()

      // Then
      assert(!pool.hasFreePort())
      assert.equal(actual, expected)

      // Finally
      pool.deallocatePort(expected)
    })

    it('should throw if none available', () => {
      // Given
      const pool = new UDPSocketPool()

      // When + Then
      assert(!pool.hasFreePort())
      assert.throws(() => pool.getPort())
    })
  })

  describe('returnPort', () => {
    it('should make port available', async () => {
      // Given
      const pool = new UDPSocketPool()
      await pool.allocatePort()
      const port = pool.getPort()

      // When
      pool.returnPort(port)

      // Then
      assert(pool.hasFreePort())

      // Finally
      pool.deallocatePort(port)
    })

    it('should ignore unknown', async () => {
      // Given
      const pool = new UDPSocketPool()

      // When + then
      assert.doesNotThrow(() => pool.returnPort(65575))
    })
  })
})
