import * as net from 'node:net'
import * as dgram from 'node:dgram'
import { describe, it, before, after } from 'node:test'
import assert, { fail } from 'node:assert'
import { End2EndContext } from './context.mjs'
import { promiseEvent, sleep } from '../../src/utils.mjs'
import { config } from '../../src/config.mjs'

describe('Connection', () => {
  const context = new End2EndContext()

  const host = {
    /** @type {net.Socket} */
    tcp: undefined,

    /** @type {dgram.Socket} */
    udp: undefined,

    oid: '',
    pid: ''
  }

  const client = {
    /** @type {net.Socket} */
    tcp: undefined,

    /** @type {dgram.Socket} */
    udp: undefined,

    targetRelay: undefined
  }

  before(async () => {
    await context.startup()

    context.log.info('Connecting to noray')
    host.tcp = await context.connect()
    client.tcp = await context.connect()

    context.log.info('Creating UDP sockets')
    host.udp = dgram.createSocket('udp4')
    client.udp = dgram.createSocket('udp4')

    context.log.info('Binding UDP')
    host.udp.bind()
    client.udp.bind()

    context.log.info('Waiting for UDP sockets to start listening')
    await Promise.all([
      promiseEvent(host.udp, 'listening'),
      promiseEvent(client.udp, 'listening')
    ])

    context.log.info('Startup done')
  })

  it('should register host', async () => {
    // Register host
    host.tcp.write('register-host\n')
    const response = await context.read(host.tcp)

    host.oid = response
      .filter(cmd => cmd.startsWith('set-oid '))
      .map(cmd => cmd.split(' ')[1])
      .at(0) ?? fail('Failed to get oid!')

    host.pid = response
      .filter(cmd => cmd.startsWith('set-pid '))
      .map(cmd => cmd.split(' ')[1])
      .at(0) ?? fail('Failed to get pid!')

    // Register UDP port
    let relayStatus = undefined
    host.udp.on('message', (msg, _rinfo) => {
      context.log.info('Received message: %s', msg.toString())
      relayStatus = msg.toString('utf8')
    })

    for (let i = 0; i < 64; ++i) {
      context.log.info(
        'Attempt #%d sending pid to registrar port %d',
        i + 1, config.udpRelay.registrarPort
      )
      host.udp.send(host.pid, config.udpRelay.registrarPort)
      await sleep(0.05)

      if (relayStatus !== undefined) {
        break
      }
    }
    host.udp.removeAllListeners()

    assert.equal(relayStatus, 'OK')
  })

  it('should reply with relay port', async () => {
    // Request to connect
    client.tcp.write(`connect-relay ${host.oid}\n`)

    client.targetRelay = (await context.read(client.tcp))
      .filter(cmd => cmd.startsWith('connect-relay'))
      .map(cmd => cmd.split(' ')[1])
      .at(0) ?? fail('Failed to get relay port!')

    context.log.info('Client received relay port %d', client.targetRelay)
  })

  it('should relay data', async () => {
    // Since it's all running on localhost, let's assume the data gets through
    const message = 'Hello from client!'
    const response = 'Hello from host!'

    const hostReceived = []
    const clientReceived = []

    host.udp.on('message', (msg, rinfo) => {
      hostReceived.push(msg.toString())
      host.udp.send(response, rinfo.port, rinfo.address)
    })

    client.udp.on('message', (msg, _rinfo) => {
      clientReceived.push(msg.toString())
    })

    client.udp.send(message, client.targetRelay)

    // Check if data went through both ways
    await sleep(0.1)
    assert.equal(hostReceived.join(''), message)
    assert.equal(clientReceived.join(''), response)
  })

  after(() => {
    host.udp.close()
    client.udp.close()

    context.shutdown()
  })
})
