/* eslint-disable */
import * as net from 'node:net'
/* eslint-enable */
import * as readline from 'node:readline'
import * as events from 'node:events'
import assert from 'node:assert'

/**
* Protocol implementation.
*
* The "protocol" itself is as follows:
*
* ```
* <command> <data>\n
* <command>\n
* ```
*
* If the incoming data fits either of the above formats, an event with the
* command's name is emitted. The data can be an arbitrary string. The same
* applies to the command, with the exception that it can't contain spaces.
*/
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
  * Configure server using callback.
  * @param {function(ProtocolServer)} cb Callback
  * @returns {ProtocolServer} Server
  */
  configure (cb) {
    cb.apply(this)
    return this
  }

  /**
  * Send a command through socket.
  * @param {net.Socket} socket Socket
  * @param {string} command Command
  * @param {string} [data] Data
  */
  send (socket, command, data) {
    assert(!command.includes(' '), 'Command can\'t contain spaces!')
    assert(!command.includes('\n'), 'Command can\'t contain newlines!')
    assert(!data || !data.includes('\n'), 'Data can\'t contain newlines!')

    socket.write(data
      ? `${command} ${data}\n`
      : `${command}\n`
    )
  }

  /**
  * @param {net.Socket} socket
  * @param {string} line
  */
  #handleLine (socket, line) {
    const idx = line.indexOf(' ')

    const [command, data] = idx >= 0
      ? [line.slice(0, idx), line.slice(idx + 1)]
      : [line, '']

    this.emit(command, data, socket)
  }
}
