import * as http from 'node:http'
import { Noray } from '../noray.mjs'
import logger from '../logger.mjs'

const log = logger.child({ name: 'mod:metrics' })

Noray.hook(noray => {
  log.info('Starting HTTP server to serve metrics')

  const httpServer = new http.Server()
  httpServer.on('request', (req, res) => {
    if (req.url !== '/metrics') {
      res.statusCode = 404
      res.end()
      return
    }

    res.write('up=yes')
    res.end()
  })

  httpServer.listen(3000, () => log.info('Serving metrics over HTTP on port %d', 3000))

  noray.on('close', () => {
    log.info('noray closing, shutting down HTTP server')
    httpServer.close()
    httpServer.closeAllConnections()
  })
})
