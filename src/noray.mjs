import * as net from 'node:net'
import { EventEmitter } from 'node:events'
import logger from './logger.mjs'
import { config } from './config.mjs'
import { ProtocolServer } from './protocol/protocol.server.mjs'

const defaultModules = [
  'metrics/metrics.mjs',
  'relay/relay.mjs',
  'echo/echo.mjs',
  'hosts/host.mjs',
  'connection/connection.mjs'
]

const hooks = []

export class Noray extends EventEmitter {
  /** @type {net.Server} */
  #socket

  /** @type {ProtocolServer} */
  #protocolServer

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

    const socket = net.createServer()

    this.#socket = socket
    this.#protocolServer = new ProtocolServer()

    // Import modules for hooks
    for (const m of modules) {
      this.#log.info('Pulling module %s for hooks', m)
      await import(`../src/${m}`)
    }

    // Run hooks
    this.#log.info('Running %d hooks', hooks.length)
    hooks.forEach(h => h(this))
    this.#log.info('Hooks done')

    socket.listen(config.socket.port, config.socket.host, () => {
      this.#log.info(
        'Listening on %s:%s',
        config.socket.host, config.socket.port
      )

      socket.on('error', err => {
        this.#log.error('Listen socket encountered an error!')
        this.#log.error(err)
      })

      socket.on('connection', conn => {
        this.#protocolServer.attach(conn)
        conn.on('close', () => this.#protocolServer.detach(conn))
        conn.on('error', err => {
          this.#log.error('Connection socket encountered an error!')
          this.#log.error(err)
        })
      })

      this.emit('listening', config.socket.port, config.socket.host)
    })
  }

  shutdown () {
    this.#log.info('Shutting down')

    this.emit('close')
    this.#socket.close()
  }

  get protocolServer () {
    return this.#protocolServer
  }
}
