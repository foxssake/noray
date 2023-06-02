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
    const len = line.length
    const idx = line.indexOf(' ')

    const command = line.slice(0, (len + idx) % len)
    const data = line.slice((len + idx) % len + 1)

    this.emit(command, data, socket)
  }
}
