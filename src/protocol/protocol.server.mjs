import * as net from 'node:net'
import * as readline from 'node:readline'
import * as events from 'node:events'

export class ProtocolServer extends events.EventEmitter {
  #readers = new Map()

  /**
  * Attach socket to server.
  * @param {net.Socket} socket
  */
  attach (socket) {
    const rl = readline.createInterface({
      input: socket
    })

    rl.on('line', line => this.#handleLine(socket, line))
    this.#readers.set(socket, rl)
  }

  /**
  * Detach socket from server.
  * @param {net.Socket} socket
  */
  detach (socket) {
    this.#readers.get(socket)?.close()
    this.#readers.delete(socket)
  }

  /**
  * @param {net.Socket} socket
  * @param {string} line
  */
  #handleLine(socket, line) {
    const idx = line.indexOf(' ')

    const [command, data] = idx >= 0
      ? [line.slice(0, idx), line.slice(idx + 1)]
      : [line, '']

    this.emit(command, data, socket)
  }
}
