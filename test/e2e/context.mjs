import * as net from 'node:net'
import * as dgram from 'node:dgram'
import logger from '../../src/logger.mjs'
import { Noray } from '../../src/noray.mjs'
import { promiseEvent, sleep } from '../../src/utils.mjs'
import { config } from '../../src/config.mjs'

const READ_WAIT = 0.05

export class End2EndContext {
  #clients = []

  /** @type {Noray} */
  noray

  log = logger.child({ name: 'test' })

  async startup () {
    this.log.info('Starting app')

    this.noray = new Noray()
    await this.noray.start()

    this.log.info('Startup done, ready for testing')
  }

  async connect () {
    const socket = net.createConnection({
      host: config.socket.host,
      port: config.socket.port
    })
    socket.setEncoding('utf8')

    await promiseEvent(socket, 'connect')
    this.#clients.push(socket)
    return socket
  }

  async read (socket) {
    await sleep(READ_WAIT)

    const lines = []
    for (let line = ''; line != null; line = socket.read()) {
      lines.push(line)
    }

    const result = lines.join('').split('\n')
    this.log.debug({ result }, "Read data from noray")
    return result
  }

  /**
  * @param {dgram.Socket} udp
  * @param {string} pid
  */
  async registerExternal (udp, pid) {
    let done = false
    let error
    const throwaway = udp === undefined

    if (udp === undefined) {
      udp = dgram.createSocket('udp4')
      udp.bind()
      await promiseEvent(udp, 'listening')
    }

    udp.once('message', (buf, _rinfo) => {
      const msg = buf.toString('utf8')
      done = true
      error = msg !== 'OK' && msg
    })

    for (let i = 0; i < 128 && !done; ++i) {
      udp.send(pid, config.udpRelay.registrarPort)
      this.log.debug('Sending remote registrar attempt #%d', i+1)
      await sleep(0.1)
    }

    if (!done) {
      throw new Error('Registrar timed out!')
    } else if (error) {
      throw new Error(error)
    }

    const result = udp.address().port
    if (throwaway) {
      udp.close()
    }

    return result
  }

  async registerHost (socket) {
    socket.write('register-host\n')

    const data = await this.read(socket)
    
    const oid = data
      .filter(cmd => cmd.startsWith('set-oid '))
      .map(cmd => cmd.split(' ')[1])
      .at(0)

    const pid = data
      .filter(cmd => cmd.startsWith('set-pid '))
      .map(cmd => cmd.split(' ')[1])
      .at(0)

    return [oid, pid]
  }

  shutdown () {
    this.log.info('Closing %d connections', this.#clients.length)
    this.#clients.forEach(c => c.destroy())

    this.log.info('Terminating Noray')
    this.noray.shutdown()
  }
}
