import logger from '../../src/logger.mjs'
import { Natty } from '../../src/natty.mjs'
import { promiseEvent } from '../../src/utils.mjs'

export class End2EndContext {
  /** @type {Natty} */
  natty

  log = logger.child({ name: 'test' })

  async startup () {
    this.log.info('Starting app')

    this.natty = new Natty()
    await this.natty.start()

    this.log.info('Waiting for Natty ot start listening')
    await promiseEvent(this.natty, 'listening')

    this.log.info('Startup done, ready for testing')
  }

  shutdown () {
    this.log.info('Terminating Natty')
    this.natty.shutdown()
  }
}
