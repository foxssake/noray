/* eslint-disable */
import * as net from 'node:net'
/* eslint-enable */
import { EventEmitter } from 'node:events'
import logger from './logger.mjs'
import { config } from './config.mjs'
import { NodeSocketReactor } from '@foxssake/trimsock-node'
import { promiseEvent } from './utils.mjs'

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
    const hookPromises = hooks.map(h => h(this))
    this.#log.info('Hooks launched')

    this.#log.info('Waiting for hooks to finish')
    await Promise.all(hookPromises)

    // Start server
    this.#log.info('Starting TCP server')
    this.#server = this.#reactor.serve()
    this.#server.listen(config.socket.port, config.socket.host)
    this.#server.on('listening', () => {
      this.#log.info(
        'Listening on %s:%s',
        config.socket.host, config.socket.port
      )

      this.#server.on('error', err => {
        this.#log.error('Listen socket encountered an error!')
        this.#log.error(err)
      })

      this.#server.on('connection', conn => {
        conn.on('error', err => {
          this.#log.error('Connection socket encountered an error!')
          this.#log.error(err)
        })
      })

      this.emit('listening', config.socket.port, config.socket.host)
    })

    await promiseEvent(this, 'listening')
    this.#log.info('Started noray in %f ms', process.uptime() * 1000.0)
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
