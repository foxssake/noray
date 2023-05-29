import * as net from 'node:net'
import { EventEmitter } from 'node:events'
import logger from './logger.mjs'
import { config } from './config.mjs'

const defaultModules = [
  'sessions/sessions.mjs',
  'games/games.mjs',
  'lobbies/lobbies.mjs',
  'connection/connections.mjs',
  'relay/relay.mjs'
]

const hooks = []

export class Natty extends EventEmitter {
  /** @type {net.Server} */
  #socket

  #log = logger

  /**
  * Register a Natty configuration hook.
  * @param {function(Natty)} h Hook
  */
  static hook (h) {
    hooks.push(h)
  }

  async start (modules) {
    modules ??= defaultModules

    this.#log.info('Starting Natty')

    const socket = net.createServer()

    this.#socket = socket

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

      this.emit('listening', config.socket.port, config.socket.host)
    })
  }

  shutdown () {
    this.#log.info('Shutting down')

    this.emit('close')

    this.#socket.close()
  }
}
