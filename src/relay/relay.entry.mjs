/* eslint-disable */
import { NetAddress } from './net.address.mjs'
/* eslint-enable */
import { time } from '../utils.mjs'

/**
* Entry for the relay translation tables.
*/
export class RelayEntry {
  /**
  * The port on which we've received traffic
  * @type {number}
  */
  port

  /**
  * The target address where traffic should be forwarded
  * @type {NetAddress}
  */
  address

  /**
  * Time the relay was last used to send data.
  * @type {number}
  */
  lastSent = 0

  /**
  * Time the relay last received traffic on its port.
  * @type {number}
  */
  lastReceived = 0

  /**
  * Time the relay was created.
  * @type {number}
  */
  created = time()

  /**
  * Construct entry
  * @param {RelayEntry} options Options
  */
  constructor (options) {
    Object.assign(this, options)
  }

  /**
  * Check for equality
  * @param {RelayEntry} other Other
  * @returns {boolean} True if equal
  */
  equals (other) {
    return this.address.equals(other.address)
  }

  /**
  * Relay identifier
  * @type {string}
  */
  get id () {
    return `${this.address}@${this.port}`
  }
}
