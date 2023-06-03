/* eslint-disable */
import * as net from 'node:net'
/* eslint-enable */
import { nanoid } from 'nanoid'

/**
* Host entity.
*
* Hosts register in advance for other players to connect to them.
*/
export class HostEntity {
  /**
  * Open id.
  * @type {string}
  */
  oid

  /**
  * Private id.
  * @type {string}
  */
  pid

  /**
  * Socket.
  * @type {net.Socket}
  */
  socket

  /**
  * Construct entity.
  * @param {HostEntity} options Options
  */
  constructor (options) {
    options && Object.assign(this, options)

    this.oid ??= nanoid()
    this.pid ??= nanoid(128)
  }
}
