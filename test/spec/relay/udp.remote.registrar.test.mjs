import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import sinon from 'sinon'
import dgram from 'node:dgram'
import { UDPRemoteRegistrar } from '../../../src/relay/udp.remote.registrar.mjs'
import { HostRepository } from '../../../src/hosts/host.repository.mjs'
import { HostEntity } from '../../../src/hosts/host.entity.mjs'

describe('UDPRemoteRegistrar', () => {
  /** @type {sinon.SinonFakeTimers} */
  let clock

  /** @type {sinon.SinonStubbedInstance<HostRepository>} */
  let hostRepository
  /** @type {sinon.SinonStubbedInstance<dgram.Socket>} */
  let socket

  /** @type {UDPRemoteRegistrar} */
  let remoteRegistrar

  /** @type {HostEntity} */
  let host

  beforeEach(() => {
    host = new HostEntity({
      oid: 'h0001',
      pid: 'p0001'
    })
    clock = sinon.useFakeTimers()

    hostRepository = sinon.createStubInstance(HostRepository)
    socket = sinon.createStubInstance(dgram.Socket)

    hostRepository.findByPid.withArgs(host.pid).returns(host)
    socket.bind.callsArg(2) // Instantly resolve on bind
    socket.address.returns({
      address: '127.0.0.1',
      port: 32768
    })

    remoteRegistrar = new UDPRemoteRegistrar({
      hostRepository, socket
    })
  })

  it('should succeed', async () => {
    // Given
    const msg = Buffer.from(host.pid)
    const rinfo = { address: '88.57.0.3', port: 32745 }

    await remoteRegistrar.listen()
    const messageHandler = socket.on.lastCall.callback

    // When
    await messageHandler(msg, rinfo)

    // Then
    assert.deepEqual(
      socket.send.lastCall?.args,
      ['OK', rinfo.port, rinfo.address]
    )
    assert.equal(host.rinfo, rinfo)
  })

  it('should fail on unknown pid', async () => {
    // Given
    const msg = Buffer.from(host.pid)
    const rinfo = { address: '88.57.0.3', port: 32745 }

    await remoteRegistrar.listen()
    const messageHandler = socket.on.lastCall.callback

    hostRepository.findByPid.withArgs(host.pid).returns(undefined)

    // When
    await messageHandler(msg, rinfo)

    // Then
    assert.deepEqual(
      socket.send.lastCall?.args,
      ['Unknown host pid!', rinfo.port, rinfo.address]
    )
  })

  it('should fail on throw', async () => {
    // Given
    const msg = Buffer.from(host.pid)
    const rinfo = { address: '88.57.0.3', port: 32745 }

    await remoteRegistrar.listen()
    const messageHandler = socket.on.lastCall.callback

    socket.send.onFirstCall().throws(new Error('Test'))

    // When
    await messageHandler(msg, rinfo)

    // Then
    assert.deepEqual(
      socket.send.lastCall?.args,
      ['Test', rinfo.port, rinfo.address]
    )
  })

  afterEach(() => {
    clock.restore()
  })
})
