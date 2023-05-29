import logger from '../../src/logger.mjs'
import { Noray } from '../../src/noray.mjs'
import { promiseEvent } from '../../src/utils.mjs'

export class End2EndContext {
  /** @type {Noray} */
  noray

  log = logger.child({ name: 'test' })

  async startup () {
    this.log.info('Starting app')

    this.noray = new Noray()
    await this.noray.start()

    this.log.info('Waiting for Noray ot start listening')
    await promiseEvent(this.noray, 'listening')

    this.log.info('Startup done, ready for testing')
  }

  shutdown () {
    this.log.info('Terminating Noray')
    this.noray.shutdown()
  }
}
