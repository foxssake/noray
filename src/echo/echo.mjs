import { Noray } from '../noray.mjs'
import logger from '../logger.mjs'

const log = logger.child({ name: 'mod:echo' })

Noray.hook(noray => {
  log.info('Adding echo command')

  noray.protocolServer.on('echo', (data, socket) => {
    socket.write(`echo ${data}\n`)
    log.info('Echoing: %s', data)
  })
})
