import assert from 'node:assert'
import dgram from 'node:dgram'

/**
* Class to manage and allocate UDP ports as needed.
*
* The socket pool is used during UDP relaying. We need to both listen on and
* send traffic through multiple ports during relay. The socket pool ensures
* that these sockets are always available.
*
* This is a low-level interface, concerned only with the allocation, storage
* and deallocation of ports and by extension, UDP sockets.
*/
export class UDPSocketPool {
  /**
  * Port to socket
  * @type {Map<number, dgram.Socket>}
  */
  #sockets = new Map()

  /**
  * Free ports
  * @type {number[]}
  */
  #freePorts = []

  /**
  * Allocate a new port for relaying.
  *
  * If port is unset or 0, a random port will be picked by the OS.
  * @param {number} [port=0] Port to allocate
  * @returns {Promise<number>} Allocated port
  * @throws if allocation fails
  */
  allocatePort (port) {
    return new Promise((resolve, reject) => {
      const socket = dgram.createSocket('udp4')
      socket.once('error', reject)
      socket.bind(port ?? 0, () => {
        port = this.addSocket(socket)
        resolve(port)
      })
    })
  }

  /**
  * Close the socket associated with the given port.
  *
  * Does nothing if the port is not managed by the relay.
  * @param {number} port Port
  */
  deallocatePort (port) {
    this.#sockets.get(port)?.close()
    this.#sockets.delete(port)
    this.#freePorts = this.#freePorts.filter(p => p !== port)
  }

  /**
  * Get socket listening on port.
  * @param {number} port Port
  * @returns {dgram.Socket|undefined} Socket
  */
  getSocket (port) {
    return this.#sockets.get(port)
  }

  /**
  * Add an already listening socket to use for relaying.
  * @param {dgram.Socket} socket Socket
  * @returns {number} Relay port
  */
  addSocket (socket) {
    const port = socket.address().port
    this.#sockets.set(port, socket)
    this.#freePorts.push(port)

    return port
  }

  /**
  * Get a free port to use for relaying.
  *
  * The resulting port can be converted into a socket using `getSocket`.
  * @returns {number}
  * @throws if no free ports are available
  */
  getPort () {
    assert(this.#freePorts.length > 0, 'No more free ports!')
    return this.#freePorts.pop()
  }

  /**
  * Returns a port to the pool.
  *
  * After this call, the port can be reused. Does nothing if the port is not
  * managed by the relay. @param {number} port Port
  */
  returnPort (port) {
    if (!this.#sockets.has(port)) {
      return
    }

    this.#freePorts.push(port)
  }

  /**
  * Check if there are any free ports in the pool. @returns {boolean} True if
  * there's a free port, false otherwise
  */
  hasFreePort () {
    return this.#freePorts.length > 0
  }

  /**
  * Close all sockets managed by this pool, freeing up all associated system
  * resources.
  */
  clear () {
    [...this.#sockets.keys()].forEach(port => this.deallocatePort(port))
  }

  /**
  * Allocated ports.
  * @type {number[]}
  */
  get ports () {
    return [...this.#sockets.keys()]
  }
}
