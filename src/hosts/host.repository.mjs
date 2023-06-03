/* eslint-disable */
import { HostEntity } from './host.entity.mjs'
/* eslint-enable */
import { Repository, fieldIdMapper } from "../repository.mjs";

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
}

export const hostRepository = new HostRepository()
