import * as net from 'node:net'
import logger from '../../src/logger.mjs'
import { Noray } from '../../src/noray.mjs'
import { promiseEvent } from '../../src/utils.mjs'
import { config } from '../../src/config.mjs'

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

  shutdown () {
    this.log.info('Closing %d connections', this.#clients.length)
    this.#clients.forEach(c => c.destroy())

    this.log.info('Terminating Noray')
    this.noray.shutdown()
  }
}
