/* eslint-disable */
import * as net from 'node:net'
import { HostEntity } from './host.entity.mjs'
/* eslint-enable */
import { Repository, fieldIdMapper } from '../repository.mjs'

/**
* Repository for tracking hosts.
*
* @extends {Repository<HostEntity>}
*/
export class HostRepository extends Repository {
  constructor () {
    super({
      idMapper: fieldIdMapper('oid')
    })
  }

  /**
  * Find host by private id.
  * @param {string} pid Private id
  * @returns {HostEntity|undefined} Host
  */
  findByPid (pid) {
    return [...this.list()].find(host => host.pid === pid)
  }

  /**
  * Find host by socket.
  * @param {net.Socket} socket Socket
  * @returns {HostEntity|undefined} Host
  */
  findBySocket (socket) {
    return [...this.list()].find(host => host.socket === socket)
  }
}
