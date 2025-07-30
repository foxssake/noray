import { Noray } from '../noray.mjs'
import logger from '../logger.mjs'
import { handleRegisterHost } from './host.commands.mjs'
import { HostRepository } from './host.repository.mjs'

const log = logger.child({ name: 'mod:host' })

export const hostRepository = new HostRepository()

Noray.hook(noray => {
  log.info('Registering host commands')

  noray.reactor
    .configure(handleRegisterHost(hostRepository))
})
