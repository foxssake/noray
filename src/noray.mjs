/* eslint-disable */
import * as net from 'node:net'
/* eslint-enable */
import { EventEmitter } from 'node:events'
import logger from './logger.mjs'
import { config } from './config.mjs'
import { NodeSocketReactor } from '@foxssake/trimsock-node'

const defaultModules = [
  'metrics/metrics.mjs',
  'relay/relay.mjs',
  'hosts/host.mjs',
  'connection/connection.mjs'
]

const hooks = []

export class Noray extends EventEmitter {
  /** @type {net.Server} */
  #server

  /** @type {NodeSocketReactor} */
  #reactor

  #log = logger

  /**
  * Register a Noray configuration hook.
  * @param {function(Noray)} h Hook
  */
  static hook (h) {
    hooks.push(h)
  }

  async start (modules) {
    modules ??= defaultModules

    this.#log.info('Starting Noray')

    this.#reactor = new NodeSocketReactor()
      .onError((command, exchange, error) => {
        exchange.failOrSend({ name: command.name, data: '' + error })
      })

    // Import modules for hooks
    for (const m of modules) {
      this.#log.info('Pulling module %s for hooks', m)
      await import(`../src/${m}`)
    }

    // Run hooks
    this.#log.info('Running %d hooks', hooks.length)
    hooks.forEach(h => h(this))
    this.#log.info('Hooks done')

    // Start server
    this.#log.info('Starting TCP server')
    this.#server = this.#reactor.serve().listen(config.socket.port, config.socket.host, () => {
      this.#log.info(
        'Listening on %s:%s',
        config.socket.host, config.socket.port
      )

      this.emit('listening', config.socket.port, config.socket.host)
    })
  }

  shutdown () {
    this.#log.info('Shutting down')

    this.emit('close')
    this.#server.close()
  }

  get reactor () {
    return this.#reactor
  }
}
