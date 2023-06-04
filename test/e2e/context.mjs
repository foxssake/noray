import * as net from 'node:net'
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

    this.log.info('Waiting for Noray ot start listening')
    await promiseEvent(this.noray, 'listening')

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

    console.log('Got response', lines.join(''))
    return lines.join('').split('\n')
  }

  shutdown () {
    this.log.info('Closing %d connections', this.#clients.length)
    this.#clients.forEach(c => c.destroy())

    this.log.info('Terminating Noray')
    this.noray.shutdown()
  }
}
