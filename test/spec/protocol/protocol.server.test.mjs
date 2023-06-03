import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import sinon from 'sinon'
import * as net from 'node:net'
import { ProtocolServer } from '../../../src/protocol/protocol.server.mjs'
import { promiseEvent, sleep } from '../../../src/utils.mjs'

describe('ProtocolServer', () => {
  /** @type {net.Socket} */
  let socket

  /** @type {ProtocolServer} */
  let server

  /** @type {net.Server} */
  let host

  beforeEach(async () => {
    server = new ProtocolServer()

    host = net.createServer(conn => server.attach(conn))
    host.listen()
    await promiseEvent(host, 'listening')

    socket = net.createConnection(host.address().port)
    await promiseEvent(socket, 'connect')
  })

  it('should emit event with data', async () => {
    // Given
    const handler = sinon.mock()
    server.on('command', handler)

    // When
    socket.write('command data\n')
    await sleep(0.05)

    // Then
    assert.equal(handler.args[0][0], 'data')
  })

  it('should emit event without data', async () => {
    // Given
    const handler = sinon.mock()
    server.on('command', handler)

    // When
    socket.write('command\n')
    await sleep(0.05)

    // Then
    assert.equal(handler.args[0][0], '')
  })

  it('should not emit without nl', async () => {
    // Given
    const handler = sinon.mock()
    server.on('command', handler)

    // When
    socket.write('command')
    await sleep(0.05)

    // Then
    assert(handler.notCalled)
  })

  afterEach(() => {
    socket.destroy()
    host.close()
  })
})
