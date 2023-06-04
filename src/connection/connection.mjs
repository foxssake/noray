import { Noray } from '../noray.mjs'
import logger from '../logger.mjs'
import { handleConnect } from './connection.commands.mjs'
import { hostRepository } from '../hosts/host.mjs'

const log = logger.child({ name: 'mod:connection' })

Noray.hook(noray => {
  log.info('Registering host commands')
  noray.protocolServer.configure(handleConnect(hostRepository))
})
