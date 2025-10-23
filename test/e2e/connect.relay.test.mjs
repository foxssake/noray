import * as net from 'node:net'
import * as dgram from 'node:dgram'
import { describe, it, before, after } from 'node:test'
import assert, { fail } from 'node:assert'
import { End2EndContext } from './context.mjs'
import { promiseEvent, sleep } from '../../src/utils.mjs'

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

    targetRelay: undefined,

    oid: '',
    pid: ''
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

    context.log.info('Host bound to UDP port %d', host.udp.address().port)
    context.log.info('Client bound to UDP port %d', client.udp.address().port)

    context.log.info('Startup done')
  })

  it('should register host', async () => {
    // Register hosts
    [host.oid, host.pid] = await context.registerHost(host.tcp)
    assert(host.oid, 'Failed to get host oid!')
    assert(host.pid, 'Failed to get host pid!')

    ;[client.oid, client.pid] = await context.registerHost(client.tcp)
    assert(client.oid, 'Failed to get client oid!')
    assert(client.pid, 'Failed to get client pid!')

    // Register UDP port
    context.log.info('Registering host external address')
    await context.registerExternal(host.udp, host.pid)
    context.log.info('Registering client external address')
    await context.registerExternal(client.udp, client.pid)
  })

  it('should reply with relay port', async () => {
    // Request to connect
    context.log.info('Connecting over relay')
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
      console.log('Host got message', JSON.stringify({ msg: msg.toString(), rinfo }))
      host.udp.send(response, rinfo.port, rinfo.address)
    })

    client.udp.on('message', (msg, _rinfo) => {
      clientReceived.push(msg.toString())
    })

    console.log('Sending initial packet to port ', client.targetRelay)
    client.udp.send(message, client.targetRelay)

    // Check if data went through both ways
    context.log.info('Waiting for messages to go through')
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
